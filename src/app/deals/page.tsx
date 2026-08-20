import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { getAllProducts } from "@/lib/products";

export const metadata = { title: "Hot Deals | MyDealBuddy" };

export default async function DealsPage() {
  const products = await getAllProducts();
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title="Hot Deals"
          crumbs={[{ label: "Home", href: "/" }, { label: "Deals" }]}
          products={products}
          initialFilters={{ dealsOnly: true }}
        />
      </main>
      <Footer />
    </>
  );
}
