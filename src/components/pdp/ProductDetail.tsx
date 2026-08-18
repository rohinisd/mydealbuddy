"use client";

import { useMemo, useState } from "react";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { ProductCard } from "@/components/product/ProductCard";
import { CoinIcon, HeartIcon, ShareIcon, StarIcon, TagIcon, TruckIcon } from "@/components/icons/Icons";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { PRODUCT_CATEGORIES } from "@/data/categories";
import { discountPct, getSku, type Product } from "@/types/product";

const MOCK_REVIEWS = [
  { name: "Priya S.", rating: 5, date: "3 weeks ago", text: "Exactly as described, arrived faster than expected. Great value for the price." },
  { name: "Marcus T.", rating: 4, date: "1 month ago", text: "Good quality overall. Packaging could be sturdier but the product itself is solid." },
  { name: "Aisha K.", rating: 5, date: "2 months ago", text: "Bought this after seeing the deal price and it did not disappoint. Would buy again." },
];

const RATING_DISTRIBUTION = [
  { stars: 5, pct: 62 },
  { stars: 4, pct: 24 },
  { stars: 3, pct: 9 },
  { stars: 2, pct: 3 },
  { stars: 1, pct: 2 },
];

function GalleryTile({ color, index }: { color: string; index: number }) {
  return (
    <div
      className="aspect-[3/4] w-full rounded-md border border-border"
      style={{ backgroundColor: color, opacity: index === 0 ? 1 : 0.85 }}
    />
  );
}

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [selectedOption, setSelectedOption] = useState(product.options?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [zip, setZip] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const category = PRODUCT_CATEGORIES.find((c) => c.slug === product.category);
  const pct = discountPct(product.price, product.mrp);
  const wishlisted = has(product.id);

  const gallery = useMemo(
    () => [product.swatch, product.swatchHover, product.swatch, product.swatchHover],
    [product.swatch, product.swatchHover]
  );

  function handleAddToCart() {
    addItem(product.id, selectedOption, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  }

  function handleCheckDelivery(e: React.FormEvent) {
    e.preventDefault();
    if (!zip.trim()) return;
    const from = new Date();
    const to = new Date();
    from.setDate(from.getDate() + 4);
    to.setDate(to.getDate() + 7);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    setDeliveryEstimate(`Delivery by ${fmt(from)} – ${fmt(to)}`);
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          ...(category ? [{ label: category.label, href: `/product-category/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Image grid */}
        <div className="grid grid-cols-2 gap-2">
          {gallery.map((color, i) => (
            <GalleryTile key={i} color={color} index={i} />
          ))}
        </div>

        {/* Buy rail */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-lg font-bold text-text-primary">{product.brand}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{product.name}</p>

          {product.rating && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <span className="flex items-center gap-1 rounded bg-rating px-1.5 py-0.5 text-xs font-semibold text-white">
                {product.rating.toFixed(1)} <StarIcon className="h-3 w-3" />
              </span>
              <span className="text-text-muted underline-offset-2 hover:underline">{product.ratingCount} Ratings</span>
            </a>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">${product.price.toFixed(2)}</span>
              {product.mrp && <span className="text-sm text-text-muted line-through">${product.mrp.toFixed(2)}</span>}
              {pct && <span className="text-sm font-semibold text-discount">({pct}% OFF)</span>}
            </div>
            <p className="mt-1 text-xs font-medium text-price-note">inclusive of all taxes</p>
          </div>

          {product.options && product.options.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Select Option</p>
              <div className="flex flex-wrap gap-2">
                {product.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedOption(opt)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                      selectedOption === opt
                        ? "border-accent bg-surface-soft text-accent-ink"
                        : "border-border-strong text-text-secondary hover:border-text-secondary"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center rounded-md border border-border-strong">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-text-secondary hover:text-accent"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-text-secondary hover:text-accent"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {product.inStock === false && <span className="text-xs font-semibold text-discount">Out of stock</span>}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.inStock === false}
              className="btn-tracking flex-1 rounded-md bg-accent py-3 text-sm font-bold uppercase text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {justAdded ? "Added to Bag ✓" : "Add to Cart"}
            </button>
            <button
              type="button"
              onClick={() => toggle(product.id)}
              className="btn-tracking flex items-center gap-2 rounded-md border border-border-strong px-5 text-sm font-bold uppercase text-text-primary hover:border-accent"
            >
              <HeartIcon filled={wishlisted} className={`h-4 w-4 ${wishlisted ? "text-rose-500" : ""}`} />
              Wishlist
            </button>
            <button
              type="button"
              className="flex items-center justify-center rounded-md border border-border-strong px-3 text-text-secondary hover:border-accent hover:text-accent"
              aria-label="Share"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
                }
              }}
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>

          {product.buddyCoins && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-soft px-3 py-2 text-sm font-medium text-accent-ink">
              <CoinIcon className="h-4 w-4" />
              Earn {product.buddyCoins} Buddy Coins with this order
            </div>
          )}

          <form onSubmit={handleCheckDelivery} className="mt-5 border-t border-border pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              <TruckIcon className="h-4 w-4" /> Delivery Options
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Enter ZIP code"
                className="w-40 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent"
              >
                Check
              </button>
            </div>
            {deliveryEstimate && <p className="mt-2 text-sm text-price-note">{deliveryEstimate}</p>}
            <p className="mt-1 text-xs text-text-muted">Easy 7-day returns &amp; exchange</p>
          </form>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Best Offers</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <TagIcon className="mt-0.5 h-4 w-4 shrink-0 text-deal" />
                Extra 5% off on prepaid orders
              </li>
              <li className="flex items-start gap-2">
                <TagIcon className="mt-0.5 h-4 w-4 shrink-0 text-deal" />
                Use code <span className="font-semibold text-text-primary">WELCOME10</span> for 10% off orders over $50
              </li>
              {product.buddyCoins && (
                <li className="flex items-start gap-2">
                  <CoinIcon className="mt-0.5 h-4 w-4 shrink-0 text-deal" />
                  Redeem Buddy Coins at checkout for extra savings
                </li>
              )}
            </ul>
          </div>

          <p className="mt-5 border-t border-border pt-4 text-sm text-text-secondary">
            Sold by <span className="font-semibold text-text-primary">MyDealBuddy</span>
          </p>
        </div>
      </div>

      {/* Product details */}
      <div className="mt-12 max-w-3xl border-t border-border pt-8">
        <h2 className="mb-4 text-lg font-bold text-text-primary">Product Details</h2>
        <p className="text-sm leading-relaxed text-text-secondary">
          The {product.name.toLowerCase()} from {product.brand} is built for everyday reliability without the
          everyday price tag. Full specifications and detailed descriptions sync in automatically once this
          product is connected to the live WooCommerce catalog.
        </p>
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-border py-2 sm:justify-start sm:gap-4">
            <dt className="text-text-muted">Brand</dt>
            <dd className="font-medium text-text-primary">{product.brand}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-2 sm:justify-start sm:gap-4">
            <dt className="text-text-muted">Category</dt>
            <dd className="font-medium text-text-primary">{category?.label ?? product.category}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-2 sm:justify-start sm:gap-4">
            <dt className="text-text-muted">SKU</dt>
            <dd className="font-medium text-text-primary">{getSku(product)}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-2 sm:justify-start sm:gap-4">
            <dt className="text-text-muted">Availability</dt>
            <dd className="font-medium text-text-primary">{product.inStock === false ? "Out of stock" : "In stock"}</dd>
          </div>
        </dl>
      </div>

      {/* Reviews */}
      <div id="reviews" className="mt-12 max-w-3xl scroll-mt-24 border-t border-border pt-8">
        <h2 className="mb-4 text-lg font-bold text-text-primary">Ratings &amp; Reviews</h2>
        {product.rating ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="shrink-0 text-center">
              <p className="text-4xl font-bold text-text-primary">{product.rating.toFixed(1)}</p>
              <div className="mt-1 flex justify-center text-rating">
                <StarIcon className="h-4 w-4" />
              </div>
              <p className="mt-1 text-xs text-text-muted">{product.ratingCount} Ratings</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {RATING_DISTRIBUTION.map((row) => (
                <div key={row.stars} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="w-3">{row.stars}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-grey">
                    <div className="h-full rounded-full bg-rating" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="w-8 text-right">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No reviews yet — be the first to review this product.</p>
        )}

        <ul className="mt-6 space-y-5">
          {MOCK_REVIEWS.map((review) => (
            <li key={review.name} className="border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-rating px-1.5 py-0.5 text-xs font-semibold text-white">
                  {review.rating.toFixed(1)} <StarIcon className="h-3 w-3" />
                </span>
                <span className="text-sm font-semibold text-text-primary">{review.name}</span>
                <span className="text-xs text-text-muted">· {review.date}</span>
              </div>
              <p className="mt-1.5 text-sm text-text-secondary">{review.text}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Similar products */}
      {related.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="mb-6 text-lg font-bold text-text-primary">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
