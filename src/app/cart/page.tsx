import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartPageContent } from "@/components/cart/CartPageContent";

export const metadata = { title: "My Bag | MyDealBuddy" };

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <CartPageContent />
      </main>
      <Footer />
    </>
  );
}
