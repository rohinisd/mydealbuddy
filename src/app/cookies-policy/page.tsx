import { InfoPage } from "@/components/info/InfoPage";

export const metadata = { title: "Cookie Policy | MyDealBuddy" };

export default function CookiesPolicyPage() {
  return (
    <InfoPage title="Cookie Policy">
      <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
        <p>
          This placeholder Cookie Policy will be replaced with MyDealBuddy&apos;s actual legal text
          before launch. Cookies are used for cart/wishlist persistence, sign-in sessions, and
          analytics (GA4/PostHog) once those are connected.
        </p>
        <p>
          You can control cookies through your browser settings; disabling them may affect cart and
          wishlist persistence between visits.
        </p>
      </div>
    </InfoPage>
  );
}
