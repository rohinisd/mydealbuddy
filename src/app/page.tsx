import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRail } from "@/components/home/ProductRail";
import { DealCard } from "@/components/home/DealCard";
import { PromoBanner } from "@/components/home/PromoBanner";
import { AFFILIATE_DEALS } from "@/data/affiliate-deals";
import { getAllProducts } from "@/lib/products";

export default async function Home() {
  const products = await getAllProducts();
  // CJ-synced products have no rating/badge data yet (see scripts/sync-cj-products.js
  // TODO), so "Top Collection" just falls back to catalog order and "Hot Trending
  // Deals" will render empty until deal badges get assigned to real products.
  const TOP_COLLECTION = [...products].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)).slice(0, 10);
  const HOT_DEALS = products.filter((p) => p.badges?.includes("deal")).slice(0, 10);

  return (
    <>
      <Header />

      <main className="flex-1">
        <HeroCarousel />

        <ProductRail pillLabel="Top Collection" title="Top Collection" viewAllHref="/shop" products={TOP_COLLECTION} />

        <CategoryGrid />

        <ProductRail pillLabel="Hot Trending Deals" title="Hot Trending Deals" viewAllHref="/deals" products={HOT_DEALS} />

        <section className="mx-auto max-w-[1280px] px-4 py-8">
          <h2 className="mb-5 text-xl font-semibold text-text-primary">Trending Affiliate Deals</h2>
          <div className="flex snap-x gap-4 overflow-x-auto pb-2">
            {AFFILIATE_DEALS.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PromoBanner
              headline="Beauty Essentials"
              subcopy="Up to 20% off skincare & haircare"
              href="/product-category/beauty-personal-care"
              bg="#fde8d8"
            />
            <PromoBanner
              headline="Smart Home Finds"
              subcopy="Save more every day on home upgrades"
              href="/product-category/home-kitchen"
              bg="#dff3e3"
            />
            <PromoBanner
              headline="Health & Fitness Essentials"
              subcopy="Gear up for your next goal"
              href="/product-category/health-fitness"
              bg="#e6e1fb"
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
