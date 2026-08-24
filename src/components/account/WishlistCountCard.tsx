"use client";

import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";

export function WishlistCountCard() {
  const { ids } = useWishlist();
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm font-bold text-text-primary">Wishlist</p>
      <p className="mt-2 text-2xl font-bold text-text-primary">{ids.length}</p>
      <Link href="/wishlist" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
        View wishlist →
      </Link>
    </div>
  );
}
