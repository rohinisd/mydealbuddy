import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { MOCK_PRODUCTS } from "@/data/mock-products";

export const metadata = { title: "Shop | MyDealBuddy" };

export default function ShopPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title="Shop"
          crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
          products={MOCK_PRODUCTS}
        />
      </main>
      <Footer />
    </>
  );
}
