import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountLayout } from "@/components/account/AccountLayout";
import { WishlistItems } from "@/components/wishlist/WishlistPageContent";
import { getCurrentCustomer } from "@/lib/current-customer";

export const metadata = { title: "Wishlist | MyDealBuddy" };

export default async function AccountWishlistPage() {
  const customer = await getCurrentCustomer();

  return (
    <>
      <Header />
      <AccountLayout title="Wishlist" customerFirstName={customer?.firstName}>
        <WishlistItems />
      </AccountLayout>
      <Footer />
    </>
  );
}
