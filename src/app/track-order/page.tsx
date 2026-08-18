import { InfoPage } from "@/components/info/InfoPage";
import { TrackOrderForm } from "@/components/info/TrackOrderForm";

export const metadata = { title: "Track Order | MyDealBuddy" };

export default function TrackOrderPage() {
  return (
    <InfoPage title="Track Order">
      <p className="mb-6 text-sm text-text-secondary">Enter your order number and email to check the latest status.</p>
      <TrackOrderForm />
    </InfoPage>
  );
}
