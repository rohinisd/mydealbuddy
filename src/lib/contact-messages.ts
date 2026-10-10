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
  repliedAt: string | null;
  replyMessage: string | null;
}

function rowToContactMessage(r: Record<string, unknown>): ContactMessageRow {
  return {
    id: String(r.id),
    name: r.name as string,
    email: r.email as string,
    subject: r.subject as string | null,
    message: r.message as string,
    emailSent: r.email_sent as boolean,
    createdAt: r.created_at as string,
    repliedAt: (r.replied_at as string | null) ?? null,
    replyMessage: (r.reply_message as string | null) ?? null,
  };
}

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const res = await pool.query(`SELECT * FROM contact_message ORDER BY created_at DESC`);
  return res.rows.map(rowToContactMessage);
}

export async function getContactMessageById(id: string): Promise<ContactMessageRow | null> {
  const res = await pool.query(`SELECT * FROM contact_message WHERE id = $1`, [id]);
  return res.rows[0] ? rowToContactMessage(res.rows[0]) : null;
}

export async function markContactMessageReplied(id: string, replyMessage: string): Promise<void> {
  await pool.query(`UPDATE contact_message SET replied_at = now(), reply_message = $1 WHERE id = $2`, [replyMessage, id]);
}
