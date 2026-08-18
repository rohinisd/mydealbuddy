import { InfoPage } from "@/components/info/InfoPage";

export const metadata = { title: "About Us | MyDealBuddy" };

const STATS = [
  { value: "120+", label: "Curated Products" },
  { value: "13", label: "Categories" },
  { value: "24/7", label: "Support" },
  { value: "1000s", label: "Verified Deals Shared" },
];

export default function AboutPage() {
  return (
    <InfoPage title="About Us">
      <p className="text-sm leading-relaxed text-text-secondary">
        MyDealBuddy is your daily companion for saving big. We bring you the most exclusive deals and
        verified coupon codes from top brands worldwide — all in one place, so finding a great deal
        never means digging through a dozen different sites.
      </p>
      <p className="mt-4 text-lg font-semibold text-accent">Shop. Save. Earn. Share.</p>
      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        Every purchase earns Buddy Coins you can redeem on future orders, and every referral rewards
        both you and your friend. We&apos;re building MyDealBuddy to be more than a storefront — a
        community of deal-seekers who help each other save.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-md border border-border bg-surface-grey p-4 text-center">
            <p className="text-2xl font-bold text-accent">{stat.value}</p>
            <p className="mt-1 text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
