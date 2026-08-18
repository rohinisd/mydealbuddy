import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductDetail } from "@/components/pdp/ProductDetail";
import { MOCK_PRODUCTS } from "@/data/mock-products";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";

export function generateStaticParams() {
  return MOCK_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductDetail product={product} related={getRelatedProducts(product)} />
      </main>
      <Footer />
    </>
  );
}
