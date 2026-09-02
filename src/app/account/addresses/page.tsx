import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { AddressBookContent } from "@/components/account/AddressBookContent";
import { getCurrentCustomer } from "@/lib/current-customer";
import { listAddresses } from "@/lib/customer-addresses";

export const metadata = { title: "Addresses | MyDealBuddy" };

export default async function AddressesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/addresses");

  const addresses = await listAddresses(customer.id);

  return (
    <>
    <Header />
    <AccountLayout title="Addresses" customerFirstName={customer.firstName}>
      <AddressBookContent initialAddresses={addresses} />
    </AccountLayout>
    <Footer />
    </>
  );
}
