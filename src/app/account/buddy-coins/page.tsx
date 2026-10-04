import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { CoinIcon } from "@/components/icons/Icons";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getBuddyCoinLedger, type BuddyCoinLedgerRow } from "@/lib/orders";
import { COIN_REDEMPTION_RATE } from "@/lib/buddy-coins";
import { getCustomerLoyaltyStatus, LOYALTY_TIERS } from "@/lib/loyalty-tiers";

const TIER_STYLES: Record<string, string> = {
  Bronze: "bg-[#CD7F32]/15 text-[#8a5522]",
  Silver: "bg-slate-200 text-slate-700",
  Gold: "bg-yellow-200 text-yellow-800",
  Platinum: "bg-violet-200 text-violet-800",
};

export const metadata = { title: "Buddy Coins | MyDealBuddy" };

const REASON_LABEL: Record<BuddyCoinLedgerRow["reason"], string> = {
  purchase: "Earned on order",
  referral_bonus: "Referral bonus",
  referred_signup_bonus: "Welcome bonus (referred)",
  redemption: "Redeemed on order",
  redemption_refund: "Redemption refunded",
  refund_clawback: "Refund clawback",
  review_bonus: "Review bonus",
};

function describeRow(row: BuddyCoinLedgerRow): string {
  const label = REASON_LABEL[row.reason];
  return row.orderNumber ? `${label} ${row.orderNumber}` : label;
}

export default async function BuddyCoinsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/buddy-coins");

  const [{ balance, rows }, loyalty] = await Promise.all([
    getBuddyCoinLedger(customer.id),
    getCustomerLoyaltyStatus(customer.id),
  ]);

  return (
    <>
    <Header />
    <AccountLayout title="Buddy Coins" customerFirstName={customer.firstName}>
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-grey p-5">
        <CoinIcon className="h-8 w-8 text-accent" />
        <div>
          <p className="text-2xl font-bold text-text-primary">{balance} Coins</p>
          <p className="text-xs text-text-muted">≈ ${(balance * COIN_REDEMPTION_RATE).toFixed(2)} in redeemable value</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-border p-5">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${TIER_STYLES[loyalty.tier.name]}`}>
            {loyalty.tier.name} Member
          </span>
          <span className="text-xs text-text-muted">{loyalty.tier.earnMultiplier}× Buddy Coins on every purchase</span>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {loyalty.lifetimeCoins} lifetime coins earned
          {loyalty.nextTier
            ? ` — ${loyalty.coinsToNextTier} more to reach ${loyalty.nextTier.name} (${loyalty.nextTier.earnMultiplier}× coins)`
            : " — you've reached the top tier"}
        </p>
        <div className="mt-2 flex gap-1.5">
          {LOYALTY_TIERS.map((t) => (
            <span
              key={t.name}
              className={`h-1.5 flex-1 rounded-full ${loyalty.lifetimeCoins >= t.minLifetimeCoins ? "bg-accent" : "bg-surface-grey"}`}
              title={`${t.name}: ${t.minLifetimeCoins}+ lifetime coins`}
            />
          ))}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-text-muted">History</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No activity yet — place an order to start earning Buddy Coins.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-text-primary">{describeRow(row)}</p>
                <p className="text-xs text-text-muted">{new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <span className={`font-bold ${row.amount > 0 ? "text-price-note" : "text-discount"}`}>
                {row.amount > 0 ? "+" : ""}
                {row.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
    <Footer />
    </>
  );
}
