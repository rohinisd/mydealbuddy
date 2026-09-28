"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ServiceHealth } from "@/lib/account-health";

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

export default function AccountHealthPage() {
  const [results, setResults] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function runCheck() {
    setLoading(true);
    const res = await fetch("/api/admin/account-health");
    setResults(await res.json());
    setCheckedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="mx-auto max-w-[700px] px-4 py-8">
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
    </div>
  );
}
