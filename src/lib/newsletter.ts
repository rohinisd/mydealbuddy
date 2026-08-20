import "server-only";
import { pool } from "@/lib/db";

export type SubscribeResult = "subscribed" | "already_subscribed";

export async function subscribeToNewsletter(email: string): Promise<SubscribeResult> {
  const res = await pool.query(
    `INSERT INTO newsletter_subscriber (email) VALUES ($1)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email.toLowerCase().trim()]
  );
  return res.rows.length > 0 ? "subscribed" : "already_subscribed";
}
