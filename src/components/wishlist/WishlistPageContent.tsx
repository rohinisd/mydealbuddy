"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlist } from "@/context/WishlistContext";
import { useProductsByIds } from "@/hooks/useProductsByIds";

/**
 * Just the loading/empty/grid body -- no breadcrumb or heading of its own,
 * since it's composed into two different page chromes: the standalone guest
 * page (/wishlist) and the logged-in account section (/account/wishlist,
 * inside AccountLayout, which already renders its own breadcrumb + title).
 */
export function WishlistItems() {
  const { ids } = useWishlist();
  const { products, loading } = useProductsByIds(ids);

  if (loading) {
    return <p className="py-20 text-center text-sm text-text-muted">Loading your wishlist…</p>;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
        <p className="text-base font-semibold text-text-primary">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-text-muted">Tap the heart on any product to save it here.</p>
        <Link
          href="/shop"
          className="btn-tracking mt-5 rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
