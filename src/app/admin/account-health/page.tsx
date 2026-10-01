"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ServiceHealth } from "@/lib/account-health";
import type { TrackedSubscription } from "@/lib/tracked-subscriptions";

const STATUS_STYLES: Record<ServiceHealth["status"], string> = {
  ok: "bg-surface-soft text-accent-ink",
  warning: "bg-surface-grey text-price-note",
  error: "bg-discount/10 text-discount",
  unconfigured: "bg-surface-grey text-text-muted",
};

const STATUS_LABEL: Record<ServiceHealth["status"], string> = {
  ok: "OK",
  warning: "Warning",
  error: "Error",
  unconfigured: "Not configured",
};

const TRACKED_STATUS_STYLES: Record<TrackedSubscription["status"], string> = {
  ok: "bg-surface-soft text-accent-ink",
  warning: "bg-surface-grey text-price-note",
  overdue: "bg-discount/10 text-discount",
  no_date: "bg-surface-grey text-text-muted",
};

const TRACKED_STATUS_LABEL: Record<TrackedSubscription["status"], string> = {
  ok: "OK",
  warning: "Due soon",
  overdue: "Overdue",
  no_date: "No date set",
};

interface NewTrackedForm {
  serviceName: string;
  accountLabel: string;
  kind: "api_key" | "subscription";
  renewsOn: string;
  warnDays: string;
  notes: string;
}

const BLANK_FORM: NewTrackedForm = { serviceName: "", accountLabel: "", kind: "subscription", renewsOn: "", warnDays: "14", notes: "" };

export default function AccountHealthPage() {
  const [results, setResults] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const [tracked, setTracked] = useState<TrackedSubscription[]>([]);
  const [trackedLoading, setTrackedLoading] = useState(true);
  const [form, setForm] = useState<NewTrackedForm>(BLANK_FORM);
  const [adding, setAdding] = useState(false);
  const [editDates, setEditDates] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function runCheck() {
    setLoading(true);
    const res = await fetch("/api/admin/account-health");
    setResults(await res.json());
    setCheckedAt(new Date());
    setLoading(false);
  }

  async function loadTracked() {
    setTrackedLoading(true);
    const res = await fetch("/api/admin/tracked-subscriptions");
    const data: TrackedSubscription[] = await res.json();
    setTracked(data);
    setEditDates(Object.fromEntries(data.map((t) => [t.id, t.renewsOn ?? ""])));
    setTrackedLoading(false);
  }

  useEffect(() => {
    runCheck();
    loadTracked();
  }, []);

  async function handleAddTracked(e: React.FormEvent) {
    e.preventDefault();
    if (!form.serviceName.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/tracked-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: form.serviceName,
          accountLabel: form.accountLabel || null,
          kind: form.kind,
          renewsOn: form.renewsOn || null,
          warnDays: form.warnDays ? Number(form.warnDays) : undefined,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to add.");
        return;
      }
      setForm(BLANK_FORM);
      await loadTracked();
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveDate(t: TrackedSubscription) {
    setMessage(null);
    const res = await fetch(`/api/admin/tracked-subscriptions/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewsOn: editDates[t.id] || null }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Failed to save date.");
      return;
    }
    await loadTracked();
  }

  async function handleDeleteTracked(t: TrackedSubscription) {
    if (!confirm(`Remove "${t.serviceName}" from the tracker?`)) return;
    await fetch(`/api/admin/tracked-subscriptions/${t.id}`, { method: "DELETE" });
    await loadTracked();
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Account Health</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      <p className="mb-4 text-sm text-text-secondary">
        Live checks against each integration&apos;s actual API -- confirms credentials still work right now,
        not just that they&apos;re present. Checks the currently configured CJ, Stripe, PayPal, and Resend accounts.
      </p>

      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={runCheck}
          disabled={loading}
          className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Run Health Check"}
        </button>
        {checkedAt && !loading && (
          <span className="text-xs text-text-muted">Last checked {checkedAt.toLocaleTimeString()}</span>
        )}
      </div>

      {loading && results.length === 0 ? (
        <p className="text-sm text-text-muted">Checking all accounts...</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {results.map((r) => (
            <div key={r.name} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{r.name}</p>
                <p className="mt-1 text-xs text-text-muted">{r.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        This only works if you can actually load the admin panel. If the whole site is down, this page is down
        too -- an external uptime monitor pinging the live site separately is still worth setting up for that.
      </p>

      <h2 className="mb-2 mt-10 text-lg font-semibold text-text-primary">Tracked Accounts &amp; Subscriptions</h2>
      <p className="mb-4 text-sm text-text-secondary">
        For anything with no API to check live -- domain renewal, hosting/DB billing plans, CJ&apos;s own account
        plan, etc. Enter a renewal or expiry date once; it&apos;ll flag here as &quot;Due soon&quot; within the
        warning window, and &quot;Overdue&quot; once it&apos;s passed.
      </p>

      <form onSubmit={handleAddTracked} className="mb-6 flex flex-wrap items-end gap-2 rounded-md border border-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Service</label>
          <input
            required
            value={form.serviceName}
            onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
            placeholder="e.g. Domain (mydealbuddy.com)"
            className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Account / label</label>
          <input
            value={form.accountLabel}
            onChange={(e) => setForm((f) => ({ ...f, accountLabel: e.target.value }))}
            placeholder="optional"
            className="w-36 rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Type</label>
          <select
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as NewTrackedForm["kind"] }))}
            className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          >
            <option value="subscription">Subscription</option>
            <option value="api_key">API key</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Renews / expires</label>
          <input
            type="date"
            value={form.renewsOn}
            onChange={(e) => setForm((f) => ({ ...f, renewsOn: e.target.value }))}
            className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Warn (days before)</label>
          <input
            type="number"
            min="1"
            value={form.warnDays}
            onChange={(e) => setForm((f) => ({ ...f, warnDays: e.target.value }))}
            className="w-20 rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-1 min-w-[160px] flex-col gap-1">
          <label className="text-xs text-text-muted">Notes</label>
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="optional"
            className="w-full rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </form>

      {message && <p className="mb-3 text-sm text-discount">{message}</p>}

      {trackedLoading ? (
        <p className="text-sm text-text-muted">Loading tracked accounts...</p>
      ) : tracked.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing tracked yet -- add one above.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {tracked.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {t.serviceName}
                  {t.accountLabel && <span className="font-normal text-text-muted"> · {t.accountLabel}</span>}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {t.kind === "api_key" ? "API key" : "Subscription"}
                  {t.daysUntil != null && t.status === "overdue" && ` · ${Math.abs(t.daysUntil)}d overdue`}
                  {t.daysUntil != null && t.status !== "overdue" && ` · ${t.daysUntil}d remaining`}
                  {t.notes ? ` · ${t.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={editDates[t.id] ?? ""}
                  onChange={(e) => setEditDates((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  className="rounded-md border border-border-strong px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveDate(t)}
                  className="rounded-md border border-border-strong px-2 py-1.5 text-xs font-semibold text-text-primary hover:border-accent"
                >
                  Save
                </button>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${TRACKED_STATUS_STYLES[t.status]}`}>
                  {TRACKED_STATUS_LABEL[t.status]}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTracked(t)}
                  className="rounded-md border border-discount px-2 py-1.5 text-xs font-semibold text-discount hover:bg-discount/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
