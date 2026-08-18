"use client";

import { useState } from "react";

export function TrackOrderForm() {
  const [result, setResult] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setResult(
          "Order tracking will pull live status from WooCommerce once that connection is in place — this preview form isn't wired to real order data yet."
        );
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input required placeholder="Order number" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        <input required type="email" placeholder="Email address" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
      </div>
      <button type="submit" className="btn-tracking rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90">
        Track Order
      </button>
      {result && <p className="rounded-md border border-dashed border-border bg-surface-grey p-3 text-sm text-text-secondary">{result}</p>}
    </form>
  );
}
