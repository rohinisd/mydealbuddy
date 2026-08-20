import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { searchProducts } from "@/lib/products";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const products = query ? await searchProducts(query, 100) : [];

  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title={query ? `Search results for "${query}"` : "Search"}
          crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
          products={products}
        />
      </main>
      <Footer />
    </>
  );
}
