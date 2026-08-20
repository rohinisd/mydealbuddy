import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductDetail } from "@/components/pdp/ProductDetail";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";

// No generateStaticParams: the CJ-synced catalog changes with each sync run,
// so product pages render dynamically per-request rather than at build time.

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductDetail product={product} related={await getRelatedProducts(product)} />
      </main>
      <Footer />
    </>
  );
}
