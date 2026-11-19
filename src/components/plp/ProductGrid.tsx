"use client";

import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types/product";

export function ProductGrid({
  products,
  visibleCount,
  onLoadMore,
}: {
  products: Product[];
  visibleCount: number;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visible = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  // Re-creates the observer on every visibleCount change, not just when
  // hasMore flips -- a single long-lived observer can silently stop firing
  // after the browser restores this page from Next's router cache on Back
  // navigation (scroll position and state come back, but the observer's
  // view of "is the sentinel in view" doesn't always get re-evaluated).
  // The scroll/resize fallback below covers that case directly: it doesn't
  // depend on the observer's lifecycle at all, just the live DOM position.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const checkAndLoad = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 600) onLoadMore();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);

    // Catches the case where the sentinel is already in view the moment this
    // effect runs (e.g. scroll position restored on Back) but the observer's
    // initial callback doesn't land a load in time.
    checkAndLoad();
    window.addEventListener("scroll", checkAndLoad, { passive: true });
    window.addEventListener("resize", checkAndLoad);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", checkAndLoad);
      window.removeEventListener("resize", checkAndLoad);
    };
  }, [hasMore, onLoadMore, visibleCount]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
        <p className="text-base font-semibold text-text-primary">No products match these filters</p>
        <p className="mt-1 text-sm text-text-muted">Try removing a filter or two.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-10">
          <span className="text-xs uppercase tracking-wide text-text-muted">Loading more…</span>
        </div>
      )}
    </div>
  );
}
