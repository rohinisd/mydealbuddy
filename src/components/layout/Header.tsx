import { getNavCategoryTree } from "@/lib/app-categories";
import { getActiveCampaign } from "@/lib/campaigns";
import { HeaderNav } from "@/components/layout/HeaderNav";

// All 14 top categories always show; each one's groups/leaves are pruned to
// only what actually has a product -- see getNavCategoryTree. Fetched fresh
// per request rather than cached: this app has no caching layer anywhere
// else either, and the catalog is small enough that this is cheap.
export async function Header() {
  const [categories, campaign] = await Promise.all([getNavCategoryTree(), getActiveCampaign()]);
  return (
    <>
      {campaign && (
        <div className="bg-accent px-4 py-2 text-center text-sm font-semibold text-white">{campaign.bannerText}</div>
      )}
      <HeaderNav categories={categories} />
    </>
  );
}
