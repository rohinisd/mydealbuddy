import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { getCuratedListProducts } from "@/lib/curated-lists";

export const metadata = { title: "Hot Deals | MyDealBuddy" };

// Without this, Next prerenders this page once at build time and admin
// changes to the Hot Deals curated list wouldn't show live until the next
// deploy -- same reasoning as the homepage.
export const revalidate = 60;

export default async function DealsPage() {
  const products = await getCuratedListProducts("hot-deals");
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title="Hot Deals"
          crumbs={[{ label: "Home", href: "/" }, { label: "Deals" }]}
          products={products}
        />
      </main>
      <Footer />
    </>
  );
}
