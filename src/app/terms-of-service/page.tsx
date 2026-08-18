import { InfoPage } from "@/components/info/InfoPage";

export const metadata = { title: "Terms of Service | MyDealBuddy" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service">
      <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
        <p>
          This placeholder Terms of Service will be replaced with MyDealBuddy&apos;s actual legal text
          before launch. It covers acceptable use of the site, order and payment terms, Buddy Coins
          program rules, coupon eligibility, and dispute resolution.
        </p>
        <p>
          By placing an order you agree to the pricing, shipping, and return terms shown at checkout
          and on each product page.
        </p>
      </div>
    </InfoPage>
  );
}
