import { discountPct, type Product } from "@/types/product";
import { PRICE_BUCKETS, type PLPFilters, type SortOption } from "@/types/plp";

export function filterProducts(products: Product[], filters: PLPFilters): Product[] {
  const priceBucket = PRICE_BUCKETS.find((b) => b.key === filters.priceBucket);

  return products.filter((p) => {
    if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false;
    if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false;
    if (priceBucket && !priceBucket.test(p.price)) return false;
    if (filters.discountMin !== null && (discountPct(p.price, p.mrp) ?? 0) < filters.discountMin) return false;
    if (filters.ratingMin !== null && (p.rating ?? 0) < filters.ratingMin) return false;
    if (filters.inStockOnly && p.inStock === false) return false;
    if (filters.dealsOnly && !p.badges?.includes("deal")) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const list = [...products];
  switch (sort) {
    case "newest":
      return list.sort((a, b) => Number(b.id) - Number(a.id));
    case "popularity":
      return list.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "discount-desc":
      return list.sort((a, b) => (discountPct(b.price, b.mrp) ?? 0) - (discountPct(a.price, a.mrp) ?? 0));
    case "rating-desc":
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "recommended":
    default:
      return list;
  }
}

export interface FacetCounts {
  categories: Record<string, number>;
  categoryLabels: Record<string, string>;
  brands: Record<string, number>;
}

export function computeFacetCounts(products: Product[]): FacetCounts {
  const categories: Record<string, number> = {};
  const categoryLabels: Record<string, string> = {};
  const brands: Record<string, number> = {};
  for (const p of products) {
    categories[p.category] = (categories[p.category] ?? 0) + 1;
    categoryLabels[p.category] = p.categoryLabel;
    brands[p.brand] = (brands[p.brand] ?? 0) + 1;
  }
  return { categories, categoryLabels, brands };
}
