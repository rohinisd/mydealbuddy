import { InfoPage } from "@/components/info/InfoPage";
import { QuickOrderForm } from "@/components/info/QuickOrderForm";

export const metadata = { title: "Quick Order | MyDealBuddy" };

export default function QuickOrderPage() {
  return (
    <InfoPage title="Quick Order">
      <p className="mb-6 text-sm text-text-secondary">
        Know the SKU of what you want? Enter it below to add it straight to your bag without browsing.
      </p>
      <QuickOrderForm />
    </InfoPage>
  );
}
