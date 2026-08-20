import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { getAllProducts } from "@/lib/products";

export const metadata = { title: "Shop | MyDealBuddy" };

export default async function ShopPage() {
  const products = await getAllProducts();
  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title="Shop"
          crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
          products={products}
        />
      </main>
      <Footer />
    </>
  );
}
