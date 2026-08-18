export type ProductBadge = "deal" | "sale" | "new";

export interface Product {
  id: string;
  slug: string;
  category: string;
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
  /** Placeholder swatch colors since no real product photography exists yet. */
  swatch: string;
  swatchHover: string;
}

export function discountPct(price: number, mrp?: number): number | undefined {
  if (!mrp || mrp <= price) return undefined;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * CJ-sourced products carry a `CJ...`-prefixed SKU from the supplier push into
 * WooCommerce (read-only in our app — see the sourcing/listing doc). Mock data
 * doesn't set one explicitly, so derive a placeholder in that same shape.
 */
export function getSku(product: Product): string {
  return `CJ${product.id.padStart(6, "0")}`;
}
