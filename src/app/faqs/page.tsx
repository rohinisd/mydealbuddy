import { InfoPage } from "@/components/info/InfoPage";
import { ChevronDownIcon } from "@/components/icons/Icons";

export const metadata = { title: "FAQ | MyDealBuddy" };

const FAQS = [
  { q: "How do verified coupons work?", a: "Every coupon on MyDealBuddy is checked before it's published. If a code stops working, let us know via Contact Support and we'll pull it." },
  { q: "What are Buddy Coins?", a: "Buddy Coins are reward points you earn on eligible purchases. Redeem them at checkout for a discount on future orders." },
  { q: "How do referrals work?", a: "Share your referral link from your account dashboard. When a friend makes their first purchase, you both get rewarded." },
  { q: "Can I return an item?", a: "Yes — most items are eligible for return within 7 days of delivery. See our Returns & Refunds page for details." },
  { q: "Do you ship internationally?", a: "Shipping coverage depends on the product and seller. Delivery estimates are shown on each product page." },
  { q: "How do I track my order?", a: "Use the Track Order page with your order number and email to see the latest status." },
];

export default function FaqsPage() {
  return (
    <InfoPage title="Frequently Asked Questions">
      <div className="divide-y divide-border rounded-md border border-border">
        {FAQS.map((item) => (
          <details key={item.q} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-text-secondary">{item.a}</p>
          </details>
        ))}
      </div>
    </InfoPage>
  );
}
