import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";

export const metadata = { title: "Checkout | MyDealBuddy" };

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CheckoutPageContent />
      </main>
      <Footer />
    </>
  );
}
