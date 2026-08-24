import "server-only";
import { randomBytes, createHash } from "crypto";
import { pool } from "@/lib/db";
import type { Customer } from "@/lib/customers";
import { rowToCustomer } from "@/lib/customers";

export const SESSION_COOKIE = "customer_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token to set as the cookie value -- only its hash is stored. */
export async function createSession(customerId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await pool.query(`INSERT INTO customer_session (token_hash, customer_id, expires_at) VALUES ($1,$2,$3)`, [
    hashToken(token),
    customerId,
    expiresAt,
  ]);
  return token;
}

export async function getSessionCustomer(token: string): Promise<Customer | null> {
  const res = await pool.query(
    `SELECT c.* FROM customer_session s
     JOIN customer c ON c.id = s.customer_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  return res.rows[0] ? rowToCustomer(res.rows[0]) : null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query(`DELETE FROM customer_session WHERE token_hash = $1`, [hashToken(token)]);
}
