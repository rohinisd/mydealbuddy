"use client";

import { ChevronDownIcon } from "@/components/icons/Icons";
import { SORT_OPTIONS, type SortOption } from "@/types/plp";

export function SortSelect({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (next: SortOption) => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <span className="mr-2 hidden text-sm text-text-secondary sm:inline">Sort by:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="appearance-none rounded-md border border-border-strong bg-white py-2 pl-3 pr-8 text-sm font-medium text-text-primary focus:border-accent focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-text-muted" />
    </div>
  );
}
