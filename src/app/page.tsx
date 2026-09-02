import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRail } from "@/components/home/ProductRail";
import { DealCard } from "@/components/home/DealCard";
import { PromoBanner } from "@/components/home/PromoBanner";
import { getAllProducts } from "@/lib/products";
import { getActiveHomepageBlocks } from "@/lib/homepage-content";
import { getCuratedListProducts } from "@/lib/curated-lists";

// Without this, Next prerenders "/" once at build time and admin edits (products,
// hero/promo/deal blocks) wouldn't show on the live site until the next deploy.
export const revalidate = 60;

export default async function Home() {
  const [products, heroSlides, promoBanners, dealCards, dealOfTheDay, trendingDeals, newIn] = await Promise.all([
    getAllProducts(),
    getActiveHomepageBlocks("hero_slide"),
    getActiveHomepageBlocks("promo_banner"),
    getActiveHomepageBlocks("deal_card"),
    getCuratedListProducts("deal-of-the-day", 1),
    getCuratedListProducts("trending-deals"),
    getCuratedListProducts("new-in"),
  ]);
  // CJ-synced products have no rating data, so "Top Collection" just falls
  // back to catalog order. Deal of the Day / Trending Deals / New In are all
  // admin-curated real products (see /admin/curated-lists) -- each rail
  // renders nothing until the admin actually picks something for it, rather
  // than showing a fake placeholder.
  const TOP_COLLECTION = [...products].sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0)).slice(0, 10);

  return (
    <>
      <Header />

      <main className="flex-1">
        <HeroCarousel slides={heroSlides} />

        <ProductRail pillLabel="Top Collection" title="Top Collection" viewAllHref="/shop" products={TOP_COLLECTION} />

        <CategoryGrid />

        <ProductRail pillLabel="Deal of the Day" title="Deal of the Day" viewAllHref="/deals" products={dealOfTheDay} />

        <ProductRail pillLabel="Trending Deals" title="Trending Deals" viewAllHref="/deals" products={trendingDeals} />

        <ProductRail pillLabel="New In" title="New In" viewAllHref="/shop" products={newIn} />

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
