"use client";

import { ChevronDownIcon } from "@/components/icons/Icons";
import type { FacetCounts } from "@/lib/plp";
import { DEFAULT_FILTERS, DISCOUNT_BUCKETS, PRICE_BUCKETS, RATING_BUCKETS, type PLPFilters } from "@/types/plp";

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border py-4 first:pt-0" open>
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-wide text-text-primary [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon className="h-3.5 w-3.5 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 text-sm text-text-secondary">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-border-strong accent-accent"
        />
        {label}
      </span>
      {count !== undefined && <span className="text-xs text-text-muted">{count}</span>}
    </label>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  facets,
  showHeading = true,
}: {
  filters: PLPFilters;
  onChange: (next: PLPFilters) => void;
  facets: FacetCounts;
  showHeading?: boolean;
}) {
  function toggleInList(key: "categories", value: string) {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.priceBucket !== null ||
    filters.discountMin !== null ||
    filters.ratingMin !== null ||
    filters.inStockOnly ||
    filters.dealsOnly;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {showHeading && (
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">Filters</h2>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterSection title="Categories">
        {Object.entries(facets.categories)
          .sort((a, b) => b[1] - a[1])
          .map(([slug, count]) => (
            <Checkbox
              key={slug}
              checked={filters.categories.includes(slug)}
              onChange={() => toggleInList("categories", slug)}
              label={facets.categoryLabels[slug] ?? slug}
              count={count}
            />
          ))}
      </FilterSection>

      <FilterSection title="Price">
        {PRICE_BUCKETS.map((bucket) => (
          <Checkbox
            key={bucket.key}
            checked={filters.priceBucket === bucket.key}
            onChange={() => onChange({ ...filters, priceBucket: filters.priceBucket === bucket.key ? null : bucket.key })}
            label={bucket.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Discount Range">
        {DISCOUNT_BUCKETS.map((bucket) => (
          <Checkbox
            key={bucket.min}
            checked={filters.discountMin === bucket.min}
            onChange={() =>
              onChange({ ...filters, discountMin: filters.discountMin === bucket.min ? null : bucket.min })
            }
            label={bucket.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Rating">
        {RATING_BUCKETS.map((bucket) => (
          <Checkbox
            key={bucket.min}
            checked={filters.ratingMin === bucket.min}
            onChange={() =>
              onChange({ ...filters, ratingMin: filters.ratingMin === bucket.min ? null : bucket.min })
            }
            label={bucket.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Availability & Offers">
        <Checkbox
          checked={filters.inStockOnly}
          onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
          label="In stock only"
        />
        <Checkbox
          checked={filters.dealsOnly}
          onChange={() => onChange({ ...filters, dealsOnly: !filters.dealsOnly })}
          label="Special offers / Deals"
        />
      </FilterSection>
    </div>
  );
}
