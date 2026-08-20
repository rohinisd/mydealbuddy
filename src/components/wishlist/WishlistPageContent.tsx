"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlist } from "@/context/WishlistContext";
import { useProductsByIds } from "@/hooks/useProductsByIds";

export function WishlistPageContent() {
  const { ids } = useWishlist();
  const { products, loading } = useProductsByIds(ids);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
        <p className="py-20 text-center text-sm text-text-muted">Loading your wishlist…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <h1 className="mb-6 mt-2 text-xl font-semibold text-text-primary md:text-2xl">
        My Wishlist {products.length > 0 && <span className="text-sm font-normal text-text-muted">({products.length} items)</span>}
      </h1>

      {products.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
