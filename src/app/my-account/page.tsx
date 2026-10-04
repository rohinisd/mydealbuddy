import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { WishlistCountCard } from "@/components/account/WishlistCountCard";
import { CoinIcon } from "@/components/icons/Icons";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getBuddyCoinLedger } from "@/lib/orders";
import { getReferralStats } from "@/lib/customers";
import { getCustomerLoyaltyStatus } from "@/lib/loyalty-tiers";

export const metadata = { title: "My Account | MyDealBuddy" };

export default async function MyAccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/my-account");

  const [{ balance }, referralStats, loyalty] = await Promise.all([
    getBuddyCoinLedger(customer.id),
    getReferralStats(customer.id),
    getCustomerLoyaltyStatus(customer.id),
  ]);

  return (
    <>
    <Header />
    <AccountLayout title="Overview" customerFirstName={customer.firstName}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="flex items-center justify-between text-sm font-bold text-text-primary">
            <span className="flex items-center gap-2">
              <CoinIcon className="h-4 w-4 text-accent" /> Buddy Coins
            </span>
            <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase text-accent-ink">
              {loyalty.tier.name}
            </span>
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{balance}</p>
          <Link href="/account/buddy-coins" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            View history →
          </Link>
        </div>

        <WishlistCountCard />

        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text-primary">Referrals</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{referralStats.friendsReferred}</p>
          <Link href="/account/referrals" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            Invite friends →
          </Link>
        </div>
      </div>
    </AccountLayout>
    <Footer />
    </>
  );
}
