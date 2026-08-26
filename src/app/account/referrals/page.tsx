import { redirect } from "next/navigation";
import { AccountLayout } from "@/components/account/AccountLayout";
import { CopyReferralLink } from "@/components/account/CopyReferralLink";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getReferralStats } from "@/lib/customers";
import { REFERRAL_BONUS_COINS } from "@/lib/orders";

export const metadata = { title: "Referrals | MyDealBuddy" };

export default async function ReferralsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/referrals");

  const stats = await getReferralStats(customer.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const referralLink = `${siteUrl}/signup?ref=${stats.referralCode}`;

  return (
    <AccountLayout title="Referrals" customerFirstName={customer.firstName}>
      <p className="text-sm text-text-secondary">
        Share your link — when a friend signs up and places their first order, you both earn Buddy Coins.
      </p>

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <CopyReferralLink referralLink={referralLink} />
        </div>
        <ShareMenu
          url={referralLink}
          title="Save on your next order with my MyDealBuddy referral link"
          className="mt-3 flex shrink-0 items-center justify-center rounded-md border border-border-strong px-3 py-2 text-text-secondary hover:border-accent hover:text-accent"
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{stats.totalClicks}</p>
          <p className="mt-1 text-xs text-text-muted">Link Clicks</p>
        </div>
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{stats.friendsReferred}</p>
          <p className="mt-1 text-xs text-text-muted">Friends Referred</p>
        </div>
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{stats.coinsEarnedFromReferrals}</p>
          <p className="mt-1 text-xs text-text-muted">Coins Earned</p>
        </div>
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{REFERRAL_BONUS_COINS}</p>
          <p className="mt-1 text-xs text-text-muted">Coins per Referral</p>
        </div>
      </div>
    </AccountLayout>
  );
}
