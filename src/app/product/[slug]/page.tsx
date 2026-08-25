import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductDetail } from "@/components/pdp/ProductDetail";
import { getProductBySlug, getProductDescription, getProductReviews, getRelatedProducts } from "@/lib/products";
import { getVideoForProduct } from "@/lib/product-videos";

// No generateStaticParams: the CJ-synced catalog changes with each sync run,
// so product pages render dynamically per-request rather than at build time.

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, description, reviews, video] = await Promise.all([
    getRelatedProducts(product),
    getProductDescription(product.id),
    getProductReviews(product.id),
    getVideoForProduct(product.id),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <ProductDetail product={{ ...product, description }} related={related} reviews={reviews} video={video} />
      </main>
      <Footer />
    </>
  );
}
