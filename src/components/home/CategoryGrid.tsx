import { getNavCategoryTree } from "@/lib/app-categories";
import { SubcategoryTiles } from "@/components/plp/SubcategoryTiles";

export async function CategoryGrid() {
  const tree = await getNavCategoryTree();
  if (tree.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12">
      <h2 className="mb-6 text-xl font-semibold text-text-primary">Shop Product Categories</h2>
      <SubcategoryTiles items={tree.map((t) => ({ slug: t.fullSlug, name: t.name }))} />
    </section>
  );
}
