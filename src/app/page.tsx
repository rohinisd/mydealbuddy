import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRail } from "@/components/home/ProductRail";
import { DealCard } from "@/components/home/DealCard";
import { PromoBanner } from "@/components/home/PromoBanner";
import { getAllProducts } from "@/lib/products";
import { getActiveHomepageBlocks } from "@/lib/homepage-content";

export default async function Home() {
  const [products, heroSlides, promoBanners, dealCards] = await Promise.all([
    getAllProducts(),
    getActiveHomepageBlocks("hero_slide"),
    getActiveHomepageBlocks("promo_banner"),
    getActiveHomepageBlocks("deal_card"),
  ]);
  // CJ-synced products have no rating/badge data yet (see scripts/sync-cj-products.js
  // TODO), so "Top Collection" just falls back to catalog order and "Hot Trending
  // Deals" will render empty until deal badges get assigned to real products.
  const TOP_COLLECTION = [...products].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)).slice(0, 10);
  const HOT_DEALS = products.filter((p) => p.badges?.includes("deal")).slice(0, 10);

  return (
    <>
      <Header />

      <main className="flex-1">
        <HeroCarousel slides={heroSlides} />

        <ProductRail pillLabel="Top Collection" title="Top Collection" viewAllHref="/shop" products={TOP_COLLECTION} />

        <CategoryGrid />

        <ProductRail pillLabel="Hot Trending Deals" title="Hot Trending Deals" viewAllHref="/deals" products={HOT_DEALS} />

        {dealCards.length > 0 && (
          <section className="mx-auto max-w-[1280px] px-4 py-8">
            <h2 className="mb-5 text-xl font-semibold text-text-primary">Trending Affiliate Deals</h2>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {dealCards.map((deal) => (
                <DealCard key={deal.id} headline={deal.headline} subcopy={deal.subcopy} cta={deal.cta} href={deal.href} />
              ))}
            </div>
          </section>
        )}

        {promoBanners.length > 0 && (
          <section className="mx-auto max-w-[1280px] px-4 py-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {promoBanners.map((banner) => (
                <PromoBanner
                  key={banner.id}
                  headline={banner.headline}
                  subcopy={banner.subcopy}
                  href={banner.href}
                  bg={banner.bg}
                  cta={banner.cta}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
