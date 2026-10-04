import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ProfileContent } from "@/components/account/ProfileContent";
import { getCurrentCustomer } from "@/lib/current-customer";

export const metadata = { title: "Profile | MyDealBuddy" };

export default async function ProfilePage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/account/profile");

  return (
    <>
    <Header />
    <AccountLayout title="Profile" customerFirstName={customer.firstName}>
      <ProfileContent initialCustomer={customer} />
    </AccountLayout>
    <Footer />
    </>
  );
}
