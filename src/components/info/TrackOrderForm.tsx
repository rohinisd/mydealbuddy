"use client";

import { useState } from "react";

interface TrackedOrder {
  orderNumber: string;
  statusLabel: string;
  createdAt: string;
  total: number;
  lines: { productName: string; optionLabel: string | null; quantity: number }[];
  stageMessage: string;
}

export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order number"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-tracking rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Track Order"}
        </button>
      </form>

      {error && <p className="rounded-md border border-dashed border-border bg-surface-grey p-3 text-sm text-text-secondary">{error}</p>}

      {order && (
        <div className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-text-primary">{order.orderNumber}</p>
            <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-accent-ink">{order.statusLabel}</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="mt-3 text-sm text-text-secondary">{order.stageMessage}</p>
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-text-secondary">
            {order.lines.map((line, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate pr-2">
                  {line.productName}
                  {line.optionLabel ? ` (${line.optionLabel})` : ""} × {line.quantity}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end border-t border-border pt-3 text-sm">
            <span className="font-bold text-text-primary">Total ${order.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
