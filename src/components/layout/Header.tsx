import { getPopulatedCategoryTree } from "@/lib/app-categories";
import { HeaderNav } from "@/components/layout/HeaderNav";

// Only categories with at least one active product show up here -- see
// getPopulatedCategoryTree. Fetched fresh per request rather than cached:
// this app has no caching layer anywhere else either, and the catalog is
// small enough that this is cheap.
export async function Header() {
  const categories = await getPopulatedCategoryTree();
  return <HeaderNav categories={categories} />;
}
