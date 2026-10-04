import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { PaymentMethodsContent } from "@/components/account/PaymentMethodsContent";
import { getCurrentCustomer } from "@/lib/current-customer";
import { getOrCreateStripeCustomerId, listSavedPaymentMethods } from "@/lib/stripe-customer";

export const metadata = { title: "Payment Methods | MyDealBuddy" };

export default async function PaymentMethodsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/payment-methods");

  const stripeCustomerId = await getOrCreateStripeCustomerId(customer);
  const methods = await listSavedPaymentMethods(stripeCustomerId);

  return (
    <>
    <Header />
    <AccountLayout title="Payment Methods" customerFirstName={customer.firstName}>
      <PaymentMethodsContent initialMethods={methods} />
    </AccountLayout>
    <Footer />
    </>
  );
}
