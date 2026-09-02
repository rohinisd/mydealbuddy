import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductListingPage } from "@/components/plp/ProductListingPage";
import { SubcategoryTiles } from "@/components/plp/SubcategoryTiles";
import { resolveCategoryPath, getChildCategories } from "@/lib/app-categories";
import { getProductsByCategoryScope } from "@/lib/cj-products";

// No generateStaticParams -- 572 leaf categories is too many to pre-build,
// most would be empty pages today. Rendered on demand instead.

export default async function CategoryPage({ params }: { params: Promise<{ slugs: string[] }> }) {
  const { slugs } = await params;
  const category = await resolveCategoryPath(slugs);
  if (!category) notFound();

  const [products, children] = await Promise.all([
    getProductsByCategoryScope(category),
    category.level < 3 ? getChildCategories(category.id) : Promise.resolve([]),
  ]);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    ...(category.level >= 2 ? [{ label: category.l1Name, href: `/product-category/${category.l1Slug}` }] : []),
    ...(category.level >= 3
      ? [{ label: category.l2Name!, href: `/product-category/${category.l1Slug}/${category.l2Slug}` }]
      : []),
    { label: category.name },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {children.length > 0 && (
          <div className="mx-auto max-w-[1280px] px-4 pt-6">
            <SubcategoryTiles items={children.map((c) => ({ slug: c.fullSlug, name: c.name }))} />
          </div>
        )}
        <ProductListingPage title={category.name} crumbs={crumbs} products={products} />
      </main>
      <Footer />
    </>
  );
}
