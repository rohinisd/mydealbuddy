import { getNavCategoryTree } from "@/lib/app-categories";
import { HeaderNav } from "@/components/layout/HeaderNav";

// All 14 top categories always show; each one's groups/leaves are pruned to
// only what actually has a product -- see getNavCategoryTree. Fetched fresh
// per request rather than cached: this app has no caching layer anywhere
// else either, and the catalog is small enough that this is cheap.
export async function Header() {
  const categories = await getNavCategoryTree();
  return <HeaderNav categories={categories} />;
}
