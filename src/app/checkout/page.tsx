import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import { getCurrentCustomer } from "@/lib/current-customer";

export const metadata = { title: "Checkout | MyDealBuddy" };

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();

  return (
    <>
      <Header />
      <main className="flex-1">
        <CheckoutPageContent
          isGuest={!customer}
          defaultName={customer ? `${customer.firstName} ${customer.lastName}` : ""}
          defaultEmail={customer?.email ?? ""}
        />
      </main>
      <Footer />
    </>
  );
}
