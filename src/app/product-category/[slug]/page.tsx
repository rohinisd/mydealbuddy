import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { PRODUCT_CATEGORIES } from "@/data/categories";
import { getAllProducts } from "@/lib/products";

export function generateStaticParams() {
  return PRODUCT_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = PRODUCT_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const products = await getAllProducts();

  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductListingPage
          title={category.label}
          crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.label }]}
          products={products}
          initialFilters={{ categories: [category.slug] }}
        />
      </main>
      <Footer />
    </>
  );
}
