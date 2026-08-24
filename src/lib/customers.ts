import "server-only";
import { randomBytes } from "crypto";
import { pool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerifiedAt: string | null;
  referralCode: string;
  referredByCustomerId: string | null;
  createdAt: string;
}

export function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    email: row.email as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at as string).toISOString() : null,
    referralCode: row.referral_code as string,
    referredByCustomerId: row.referred_by_customer_id != null ? String(row.referred_by_customer_id) : null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

function randomReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomReferralCode();
    const res = await pool.query(`SELECT 1 FROM customer WHERE referral_code = $1`, [code]);
    if (res.rows.length === 0) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const res = await pool.query(`SELECT * FROM customer WHERE email ILIKE $1`, [email.trim()]);
  return res.rows[0] ? rowToCustomer(res.rows[0]) : null;
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  const res = await pool.query(`SELECT * FROM customer WHERE id = $1`, [id]);
  return res.rows[0] ? rowToCustomer(res.rows[0]) : null;
}

export async function getCustomerByReferralCode(code: string): Promise<Customer | null> {
  const res = await pool.query(`SELECT * FROM customer WHERE referral_code = $1`, [code.trim().toUpperCase()]);
  return res.rows[0] ? rowToCustomer(res.rows[0]) : null;
}

export interface CreateCustomerInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referredByCustomerId?: string | null;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const passwordHash = await hashPassword(input.password);
  const referralCode = await generateUniqueReferralCode();
  const res = await pool.query(
    `INSERT INTO customer (email, password_hash, first_name, last_name, referral_code, referred_by_customer_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      input.email.trim().toLowerCase(),
      passwordHash,
      input.firstName.trim(),
      input.lastName.trim(),
      referralCode,
      input.referredByCustomerId ?? null,
    ]
  );
  return rowToCustomer(res.rows[0]);
}

export async function verifyCustomerPassword(email: string, password: string): Promise<Customer | null> {
  const res = await pool.query(`SELECT * FROM customer WHERE email ILIKE $1`, [email.trim()]);
  const row = res.rows[0];
  if (!row) return null;
  const ok = await verifyPassword(password, row.password_hash as string);
  return ok ? rowToCustomer(row) : null;
}

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createVerificationToken(customerId: string): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await pool.query(`INSERT INTO customer_verification_token (token, customer_id, expires_at) VALUES ($1,$2,$3)`, [
    token,
    customerId,
    expiresAt,
  ]);
  return token;
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const res = await pool.query(
    `SELECT customer_id, expires_at FROM customer_verification_token WHERE token = $1`,
    [token]
  );
  const row = res.rows[0];
  if (!row) return { ok: false, reason: "This verification link is invalid." };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: "This verification link has expired." };

  await pool.query(`UPDATE customer SET email_verified_at = now() WHERE id = $1`, [row.customer_id]);
  await pool.query(`DELETE FROM customer_verification_token WHERE token = $1`, [token]);
  return { ok: true };
}

export interface ReferralStats {
  referralCode: string;
  friendsReferred: number;
  coinsEarnedFromReferrals: number;
}

export async function getReferralStats(customerId: string): Promise<ReferralStats> {
  const customer = await findCustomerById(customerId);
  if (!customer) throw new Error("Customer not found");

  const [countRes, coinsRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS n FROM customer WHERE referred_by_customer_id = $1`, [customerId]),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM buddy_coin_ledger WHERE customer_id = $1 AND reason = 'referral_bonus'`,
      [customerId]
    ),
  ]);

  return {
    referralCode: customer.referralCode,
    friendsReferred: Number(countRes.rows[0].n),
    coinsEarnedFromReferrals: Number(coinsRes.rows[0].total),
  };
}
