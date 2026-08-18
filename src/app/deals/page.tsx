import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { MOCK_PRODUCTS } from "@/data/mock-products";

export const metadata = { title: "Hot Deals | MyDealBuddy" };

export default function DealsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title="Hot Deals"
          crumbs={[{ label: "Home", href: "/" }, { label: "Deals" }]}
          products={MOCK_PRODUCTS}
          initialFilters={{ dealsOnly: true }}
        />
      </main>
      <Footer />
    </>
  );
}
