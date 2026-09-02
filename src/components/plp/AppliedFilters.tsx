"use client";

import { XIcon } from "@/components/icons/Icons";
import { DEFAULT_FILTERS, DISCOUNT_BUCKETS, PRICE_BUCKETS, RATING_BUCKETS, type PLPFilters } from "@/types/plp";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function AppliedFilters({
  filters,
  onChange,
  categoryLabels = {},
}: {
  filters: PLPFilters;
  onChange: (next: PLPFilters) => void;
  categoryLabels?: Record<string, string>;
}) {
  const chips: Chip[] = [];

  for (const slug of filters.categories) {
    const label = categoryLabels[slug] ?? slug;
    chips.push({
      key: `cat-${slug}`,
      label,
      onRemove: () => onChange({ ...filters, categories: filters.categories.filter((s) => s !== slug) }),
    });
  }
  for (const brand of filters.brands) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      onRemove: () => onChange({ ...filters, brands: filters.brands.filter((b) => b !== brand) }),
    });
  }
  if (filters.priceBucket) {
    const bucket = PRICE_BUCKETS.find((b) => b.key === filters.priceBucket);
    if (bucket) chips.push({ key: "price", label: bucket.label, onRemove: () => onChange({ ...filters, priceBucket: null }) });
  }
  if (filters.discountMin !== null) {
    const bucket = DISCOUNT_BUCKETS.find((b) => b.min === filters.discountMin);
    if (bucket) chips.push({ key: "discount", label: bucket.label, onRemove: () => onChange({ ...filters, discountMin: null }) });
  }
  if (filters.ratingMin !== null) {
    const bucket = RATING_BUCKETS.find((b) => b.min === filters.ratingMin);
    if (bucket) chips.push({ key: "rating", label: bucket.label, onRemove: () => onChange({ ...filters, ratingMin: null }) });
  }
  if (filters.inStockOnly) {
    chips.push({ key: "stock", label: "In stock only", onRemove: () => onChange({ ...filters, inStockOnly: false }) });
  }
  if (filters.dealsOnly) {
    chips.push({ key: "deals", label: "Special offers / Deals", onRemove: () => onChange({ ...filters, dealsOnly: false }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="flex items-center gap-1.5 rounded-full border border-border-strong bg-white px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent"
        >
          {chip.label}
          <XIcon className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="text-xs font-semibold text-accent hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
