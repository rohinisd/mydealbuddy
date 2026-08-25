import "server-only";
import { pool } from "@/lib/db";

export async function recordReferralClick(code: string): Promise<void> {
  await pool.query(`INSERT INTO referral_click (referral_code) VALUES ($1)`, [code.trim().toUpperCase()]);
}

export async function getReferralClickCount(code: string): Promise<number> {
  const res = await pool.query(`SELECT COUNT(*) AS n FROM referral_click WHERE referral_code = $1`, [code.trim().toUpperCase()]);
  return Number(res.rows[0].n);
}
