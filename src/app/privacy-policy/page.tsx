import { InfoPage } from "@/components/info/InfoPage";

export const metadata = { title: "Privacy Policy | MyDealBuddy" };

export default function PrivacyPolicyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
        <p>
          This placeholder Privacy Policy will be replaced with MyDealBuddy&apos;s actual legal text
          before launch. It covers what data we collect (account details, order history, browsing
          activity), how it&apos;s used (order fulfillment, personalization, marketing with consent),
          and how it&apos;s protected.
        </p>
        <p>
          We never sell your personal data. Third-party processors (payment, shipping, email) only
          receive what&apos;s required to complete their function, per the integration map used to
          build this storefront.
        </p>
        <p>Questions about your data can be sent to Help.allinoneonline@gmail.com.</p>
      </div>
    </InfoPage>
  );
}
