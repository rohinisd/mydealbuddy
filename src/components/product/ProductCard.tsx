"use client";

import Link from "next/link";
import { HeartIcon, StarIcon, CoinIcon } from "@/components/icons/Icons";
import { useWishlist } from "@/context/WishlistContext";
import { discountPct, type Product } from "@/types/product";

export function ProductCard({ product }: { product: Product }) {
  const { has, toggle } = useWishlist();
  const wishlisted = has(product.id);
  const pct = discountPct(product.price, product.mrp);
  const dealBadge = product.badges?.includes("deal");
  const newBadge = product.badges?.includes("new");

  return (
    <div className="group w-full">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-surface-grey"
      >
        {/* Base image */}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-0"
          />
        ) : (
          <div
            className="absolute inset-0 transition-opacity duration-200 group-hover:opacity-0"
            style={{ backgroundColor: product.swatch }}
          />
        )}
        {/* Hover / alternate image */}
        {product.images?.[1] ? (
          <img
            src={product.images[1]}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ backgroundColor: product.swatchHover }}
          />
        )}

        {/* Top-left badge */}
        {(dealBadge || newBadge || pct) && (
          <span
            className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white ${
              dealBadge ? "bg-deal" : newBadge ? "bg-accent" : "bg-discount"
            }`}
          >
            {dealBadge ? "Deal" : newBadge ? "New" : `${pct}% OFF`}
          </span>
        )}

        {/* Wishlist heart */}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            toggle(product.id);
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-text-secondary shadow-sm transition-colors hover:text-accent"
        >
          <HeartIcon filled={wishlisted} className={`h-4 w-4 ${wishlisted ? "text-rose-500" : ""}`} />
        </button>

        {/* Rating badge */}
        {product.rating && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-medium text-text-secondary shadow-sm">
            <StarIcon className="h-3 w-3 text-rating" />
            {product.rating.toFixed(1)}
            <span className="text-text-muted">| {product.ratingCount}</span>
          </span>
        )}

        {/* Hover reveal: options + wishlist bar */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-white/95 backdrop-blur-sm transition-transform duration-200 group-hover:translate-y-0">
          {product.options && product.options.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5 text-[10px] text-text-secondary">
              {product.options.map((opt) => (
                <span key={opt} className="rounded border border-border-strong px-1.5 py-0.5">
                  {opt}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggle(product.id);
            }}
            className="btn-tracking flex w-full items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold uppercase text-text-primary"
          >
            <HeartIcon filled={wishlisted} className={`h-3.5 w-3.5 ${wishlisted ? "text-rose-500" : ""}`} />
            {wishlisted ? "Wishlisted" : "Add to wishlist"}
          </button>
        </div>
      </Link>

      <div className="mt-2 space-y-0.5">
        <Link href={`/product/${product.slug}`} className="block">
          <p className="text-sm font-bold text-text-primary">{product.brand}</p>
          <p className="line-clamp-1 text-sm text-text-secondary">{product.name}</p>
        </Link>

        <div className="flex flex-wrap items-baseline gap-1.5 pt-0.5">
          <span className="text-sm font-bold text-text-primary">${product.price.toFixed(2)}</span>
          {product.mrp && (
            <span className="text-xs text-text-muted line-through">${product.mrp.toFixed(2)}</span>
          )}
          {pct && <span className="text-xs font-semibold text-discount">({pct}% OFF)</span>}
        </div>

        {product.buddyCoins && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
            <CoinIcon className="h-3 w-3" />
            Earn {product.buddyCoins} Buddy Coins
          </div>
        )}
      </div>
    </div>
  );
}
