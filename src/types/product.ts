export type ProductBadge = "deal" | "sale" | "new";

export interface CategoryPathSegment {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  slug: string;
  /** Full category path slug (e.g. "womens-clothing/accessories/scarves-wraps"), or "uncategorized". */
  category: string;
  /** This product's own leaf category name (e.g. "Scarves & Wraps"), or "Uncategorized". */
  categoryLabel: string;
  /** Top-to-leaf breadcrumb, e.g. [{slug:"womens-clothing",name:"Women's Clothing"}, ...]. Empty when uncategorized. */
  categoryPath: CategoryPathSegment[];
  brand: string;
  name: string;
  price: number;
  mrp?: number;
  rating?: number;
  ratingCount?: number;
  options?: string[];
  badges?: ProductBadge[];
  buddyCoins?: number;
  inStock?: boolean;
  /** Real CJ SKU (productSku), when synced. */
  sku?: string;
  /** Placeholder swatch colors, used when no real photo is available. */
  swatch: string;
  swatchHover: string;
  /** Real product photo (e.g. synced from CJ). Falls back to swatch when absent. */
  image?: string;
  images?: string[];
  /** Sanitized HTML, synced from CJ (see src/lib/cj-sync.ts). */
  description?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  /** True for a real MyDealBuddy customer who purchased the product; absent for CJ-synced reviews. */
  verified?: boolean;
}

export function discountPct(price: number, mrp?: number): number | undefined {
  if (!mrp || mrp <= price) return undefined;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Falls back to a derived placeholder only if a product was synced without a SKU. */
export function getSku(product: Product): string {
  return product.sku ?? `CJ${product.id.padStart(6, "0")}`;
}
