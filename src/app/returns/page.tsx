import { InfoPage } from "@/components/info/InfoPage";

export const metadata = { title: "Returns & Refunds | MyDealBuddy" };

export default function ReturnsPage() {
  return (
    <InfoPage title="Returns & Refunds">
      <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
        <p>Most items are eligible for return within 7 days of delivery, unopened and in original packaging.</p>
        <p>
          To start a return, contact support with your order number. Once approved, refunds are issued
          to the original payment method within 5–7 business days of the item being received back.
        </p>
        <p>Buddy Coins earned on a returned order are deducted from your balance.</p>
      </div>
    </InfoPage>
  );
}
