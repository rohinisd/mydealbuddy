"use client";

import { useCallback, useMemo, useState } from "react";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { FilterSidebar } from "@/components/plp/FilterSidebar";
import { FilterDrawer } from "@/components/plp/FilterDrawer";
import { AppliedFilters } from "@/components/plp/AppliedFilters";
import { SortSelect } from "@/components/plp/SortSelect";
import { ProductGrid } from "@/components/plp/ProductGrid";
import { computeFacetCounts, filterProducts, sortProducts } from "@/lib/plp";
import { DEFAULT_FILTERS, type PLPFilters, type SortOption } from "@/types/plp";
import type { Product } from "@/types/product";

const PAGE_SIZE = 12;

export function ProductListingPage({
  title,
  crumbs,
  products,
  initialFilters,
}: {
  title: string;
  crumbs: { label: string; href?: string }[];
  products: Product[];
  initialFilters?: Partial<PLPFilters>;
}) {
  const [filters, setFilters] = useState<PLPFilters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [sort, setSort] = useState<SortOption>("recommended");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const facets = useMemo(() => computeFacetCounts(products), [products]);
  const filtered = useMemo(() => filterProducts(products, filters), [products, filters]);
  const sorted = useMemo(() => sortProducts(filtered, sort), [filtered, sort]);

  // Reset pagination when filters/sort change. Adjusting state during render
  // (React's recommended pattern) avoids an extra effect-triggered render pass.
  const resetKey = JSON.stringify(filters) + sort;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setVisibleCount(PAGE_SIZE);
  }

  const handleLoadMore = useCallback(() => {
    setVisibleCount((v) => Math.min(v + PAGE_SIZE, sorted.length));
  }, [sorted.length]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <Breadcrumb items={crumbs} />

      <div className="mb-4 mt-2 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-text-primary md:text-2xl">{title}</h1>
        <span className="text-sm text-text-muted">— {sorted.length} items</span>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-28">
            <FilterSidebar filters={filters} onChange={setFilters} facets={facets} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary lg:hidden"
            >
              Filters
            </button>
            <div className="ml-auto">
              <SortSelect value={sort} onChange={setSort} />
            </div>
          </div>

          <AppliedFilters filters={filters} onChange={setFilters} />

          <ProductGrid products={sorted} visibleCount={visibleCount} onLoadMore={handleLoadMore} />
        </div>
      </div>

      <FilterDrawer open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} resultCount={sorted.length}>
        <FilterSidebar filters={filters} onChange={setFilters} facets={facets} showHeading={false} />
      </FilterDrawer>
    </div>
  );
}
