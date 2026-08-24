import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";
import { getCurrentCustomer } from "@/lib/current-customer";

export const metadata = { title: "Checkout | MyDealBuddy" };

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/checkout");

  return (
    <>
      <Header />
      <main className="flex-1">
        <CheckoutPageContent
          defaultName={`${customer.firstName} ${customer.lastName}`}
          defaultEmail={customer.email}
        />
      </main>
      <Footer />
    </>
  );
}
