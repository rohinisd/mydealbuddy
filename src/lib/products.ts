import { MOCK_PRODUCTS } from "@/data/mock-products";
import type { Product } from "@/types/product";

export function getProductBySlug(slug: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return MOCK_PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, limit);
}
