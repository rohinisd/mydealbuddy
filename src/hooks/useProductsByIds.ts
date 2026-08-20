"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types/product";

/** Resolves real DB-backed products for a set of ids via /api/products. */
export function useProductsByIds(ids: string[]) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);
  const key = [...new Set(ids)].sort().join(",");

  useEffect(() => {
    if (!key) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products?ids=${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((data: Product[]) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { products, loading };
}
