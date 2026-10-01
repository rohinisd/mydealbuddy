import "server-only";
import { pool } from "@/lib/db";

export interface TrackedSubscription {
  id: string;
  serviceName: string;
  accountLabel: string | null;
  kind: "api_key" | "subscription";
  renewsOn: string | null; // YYYY-MM-DD, or null if there's nothing to date (e.g. "no expiry")
  warnDays: number;
  notes: string | null;
  status: "ok" | "warning" | "overdue" | "no_date";
  daysUntil: number | null;
  createdAt: string;
  updatedAt: string;
}

function computeStatus(renewsOn: string | null, warnDays: number): { status: TrackedSubscription["status"]; daysUntil: number | null } {
  if (!renewsOn) return { status: "no_date", daysUntil: null };
  const days = Math.floor((new Date(`${renewsOn}T00:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { status: "overdue", daysUntil: days };
  if (days <= warnDays) return { status: "warning", daysUntil: days };
  return { status: "ok", daysUntil: days };
}

// node-postgres parses a DATE column into a Date object at LOCAL midnight,
// not UTC -- toISOString() would convert that to UTC and roll it back a day
// in any positive-UTC-offset timezone (e.g. IST). Read the local components
// back out instead, matching how pg constructed it.
function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rowToTracked(row: Record<string, unknown>): TrackedSubscription {
  const renewsOn = row.renews_on ? formatDateOnly(row.renews_on as Date) : null;
  const warnDays = Number(row.warn_days);
  const { status, daysUntil } = computeStatus(renewsOn, warnDays);
  return {
    id: String(row.id),
    serviceName: row.service_name as string,
    accountLabel: (row.account_label as string | null) ?? null,
    kind: row.kind as TrackedSubscription["kind"],
    renewsOn,
    warnDays,
    notes: (row.notes as string | null) ?? null,
    status,
    daysUntil,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export async function listTrackedSubscriptions(): Promise<TrackedSubscription[]> {
  const res = await pool.query(
    `SELECT * FROM tracked_subscription ORDER BY (renews_on IS NULL), renews_on ASC, service_name ASC`
  );
  return res.rows.map(rowToTracked);
}

export interface CreateTrackedSubscriptionInput {
  serviceName: string;
  accountLabel?: string | null;
  kind: "api_key" | "subscription";
  renewsOn?: string | null;
  warnDays?: number;
  notes?: string | null;
}

export async function createTrackedSubscription(input: CreateTrackedSubscriptionInput): Promise<TrackedSubscription> {
  const res = await pool.query(
    `INSERT INTO tracked_subscription (service_name, account_label, kind, renews_on, warn_days, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      input.serviceName.trim(),
      input.accountLabel?.trim() || null,
      input.kind,
      input.renewsOn || null,
      input.warnDays ?? 14,
      input.notes?.trim() || null,
    ]
  );
  return rowToTracked(res.rows[0]);
}

export interface UpdateTrackedSubscriptionInput {
  serviceName?: string;
  accountLabel?: string | null;
  kind?: "api_key" | "subscription";
  renewsOn?: string | null;
  warnDays?: number;
  notes?: string | null;
}

export async function updateTrackedSubscription(id: string, input: UpdateTrackedSubscriptionInput): Promise<void> {
  const current = await pool.query(`SELECT * FROM tracked_subscription WHERE id = $1`, [id]);
  if (current.rows.length === 0) throw new Error("Tracked subscription not found");
  const existing = rowToTracked(current.rows[0]);

  await pool.query(
    `UPDATE tracked_subscription
     SET service_name = $1, account_label = $2, kind = $3, renews_on = $4, warn_days = $5, notes = $6, updated_at = now()
     WHERE id = $7`,
    [
      input.serviceName?.trim() ?? existing.serviceName,
      input.accountLabel !== undefined ? input.accountLabel?.trim() || null : existing.accountLabel,
      input.kind ?? existing.kind,
      input.renewsOn !== undefined ? input.renewsOn || null : existing.renewsOn,
      input.warnDays ?? existing.warnDays,
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      id,
    ]
  );
}

export async function deleteTrackedSubscription(id: string): Promise<void> {
  await pool.query(`DELETE FROM tracked_subscription WHERE id = $1`, [id]);
}
