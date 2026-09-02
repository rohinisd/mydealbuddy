import "server-only";
import { pool } from "@/lib/db";

export interface ContactMessageInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function saveContactMessage(input: ContactMessageInput): Promise<string> {
  const res = await pool.query(
    `INSERT INTO contact_message (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.name, input.email, input.subject ?? null, input.message]
  );
  return String(res.rows[0].id);
}

export async function markContactMessageEmailSent(id: string): Promise<void> {
  await pool.query(`UPDATE contact_message SET email_sent = true WHERE id = $1`, [id]);
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  emailSent: boolean;
  createdAt: string;
}

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const res = await pool.query(`SELECT * FROM contact_message ORDER BY created_at DESC`);
  return res.rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    emailSent: r.email_sent,
    createdAt: r.created_at,
  }));
}
