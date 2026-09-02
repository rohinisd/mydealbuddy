export interface PLPFilters {
  categories: string[];
  priceBucket: string | null;
  discountMin: number | null;
  ratingMin: number | null;
  inStockOnly: boolean;
  dealsOnly: boolean;
}

export const DEFAULT_FILTERS: PLPFilters = {
  categories: [],
  priceBucket: null,
  discountMin: null,
  ratingMin: null,
  inStockOnly: false,
  dealsOnly: false,
};

export interface PriceBucket {
  key: string;
  label: string;
  test: (price: number) => boolean;
}

export const PRICE_BUCKETS: PriceBucket[] = [
  { key: "under-15", label: "Under $15", test: (p) => p < 15 },
  { key: "15-30", label: "$15 – $30", test: (p) => p >= 15 && p < 30 },
  { key: "30-60", label: "$30 – $60", test: (p) => p >= 30 && p < 60 },
  { key: "over-60", label: "Over $60", test: (p) => p >= 60 },
];

export const DISCOUNT_BUCKETS = [
  { min: 10, label: "10% and above" },
  { min: 30, label: "30% and above" },
  { min: 50, label: "50% and above" },
];

export const RATING_BUCKETS = [
  { min: 4, label: "4★ & above" },
  { min: 3, label: "3★ & above" },
];

export type SortOption =
  | "recommended"
  | "newest"
  | "popularity"
  | "price-asc"
  | "price-desc"
  | "discount-desc"
  | "rating-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "What's New / Latest" },
  { value: "popularity", label: "Popularity" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "discount-desc", label: "Better Discount" },
  { value: "rating-desc", label: "Rating" },
];
