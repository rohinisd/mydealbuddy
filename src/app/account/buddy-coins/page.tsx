"use client";

import { AccountLayout } from "@/components/account/AccountLayout";
import { CoinIcon } from "@/components/icons/Icons";

const MOCK_LEDGER = [
  { date: "Aug 12, 2026", reason: "Order #1042 earned", delta: 12 },
  { date: "Aug 5, 2026", reason: "Redeemed at checkout", delta: -20 },
  { date: "Jul 28, 2026", reason: "Order #1031 earned", delta: 8 },
  { date: "Jul 20, 2026", reason: "Referral bonus — Marcus T.", delta: 50 },
];

export default function BuddyCoinsPage() {
  const balance = MOCK_LEDGER.reduce((sum, row) => sum + row.delta, 78);

  return (
    <AccountLayout title="Buddy Coins">
      <div className="rounded-md border border-dashed border-discount bg-surface-soft px-4 py-3 text-sm text-text-secondary">
        Preview data — real balances will read from the points ledger once the Neon-backed rewards API
        is connected (integration map §8).
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-md border border-border bg-surface-grey p-5">
        <CoinIcon className="h-8 w-8 text-accent" />
        <div>
          <p className="text-2xl font-bold text-text-primary">{balance} Coins</p>
          <p className="text-xs text-text-muted">≈ ${(balance * 0.01).toFixed(2)} in redeemable value</p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-text-muted">History</h2>
      <ul className="divide-y divide-border rounded-md border border-border">
        {MOCK_LEDGER.map((row, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-text-primary">{row.reason}</p>
              <p className="text-xs text-text-muted">{row.date}</p>
            </div>
            <span className={`font-bold ${row.delta > 0 ? "text-price-note" : "text-discount"}`}>
              {row.delta > 0 ? "+" : ""}
              {row.delta}
            </span>
          </li>
        ))}
      </ul>
    </AccountLayout>
  );
}
