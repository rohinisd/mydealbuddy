import { redirect } from "next/navigation";
import { AccountLayout } from "@/components/account/AccountLayout";
import { CoinIcon } from "@/components/icons/Icons";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getBuddyCoinLedger, type BuddyCoinLedgerRow } from "@/lib/orders";

export const metadata = { title: "Buddy Coins | MyDealBuddy" };

const REASON_LABEL: Record<BuddyCoinLedgerRow["reason"], string> = {
  purchase: "Earned on order",
  referral_bonus: "Referral bonus",
  referred_signup_bonus: "Welcome bonus (referred)",
};

function describeRow(row: BuddyCoinLedgerRow): string {
  const label = REASON_LABEL[row.reason];
  return row.orderNumber ? `${label} ${row.orderNumber}` : label;
}

export default async function BuddyCoinsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/buddy-coins");

  const { balance, rows } = await getBuddyCoinLedger(customer.id);

  return (
    <AccountLayout title="Buddy Coins" customerFirstName={customer.firstName}>
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-grey p-5">
        <CoinIcon className="h-8 w-8 text-accent" />
        <div>
          <p className="text-2xl font-bold text-text-primary">{balance} Coins</p>
          <p className="text-xs text-text-muted">≈ ${(balance * 0.01).toFixed(2)} in redeemable value</p>
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
  );
}
