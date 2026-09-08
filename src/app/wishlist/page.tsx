import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { WishlistItems } from "@/components/wishlist/WishlistPageContent";

export const metadata = { title: "My Wishlist | MyDealBuddy" };

export default function WishlistPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-4 py-6">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
          <h1 className="mb-6 mt-2 text-xl font-semibold text-text-primary md:text-2xl">My Wishlist</h1>
          <WishlistItems />
        </div>
      </main>
      <Footer />
    </>
  );
}
