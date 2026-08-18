import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";

export const metadata = { title: "My Wishlist | MyDealBuddy" };

export default function WishlistPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <WishlistPageContent />
      </main>
      <Footer />
    </>
  );
}
