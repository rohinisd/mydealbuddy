"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { CoinIcon } from "@/components/icons/Icons";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCoupon } from "@/context/CouponContext";
import { useSavedForLater } from "@/context/SavedForLaterContext";
import { useProductsByIds } from "@/hooks/useProductsByIds";

export function CartPageContent() {
  const { lines, addItem, removeItem, setQuantity } = useCart();
  const { toggle: toggleWishlist } = useWishlist();
  const { applied, setApplied, clear: clearCoupon } = useCoupon();
  const { lines: savedLines, save: saveForLater, remove: removeSaved } = useSavedForLater();
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const allProductIds = [...lines.map((l) => l.productId), ...savedLines.map((l) => l.productId)];
  const { products, loading } = useProductsByIds(allProductIds);
  const productById = new Map(products.map((p) => [p.id, p]));
  const resolved = lines
    .map((line) => ({ line, product: productById.get(line.productId) }))
    .filter((r): r is { line: typeof lines[number]; product: NonNullable<typeof r.product> } => !!r.product);
  const resolvedSaved = savedLines
    .map((line) => ({ line, product: productById.get(line.productId) }))
    .filter((r): r is { line: typeof savedLines[number]; product: NonNullable<typeof r.product> } => !!r.product);

  function handleSaveForLater(productId: string, option: string | undefined, quantity: number) {
    saveForLater(productId, option, quantity);
    removeItem(productId, option);
  }

  function handleMoveToCart(productId: string, option: string | undefined, quantity: number) {
    addItem(productId, option, quantity);
    removeSaved(productId, option);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        <p className="py-20 text-center text-sm text-text-muted">Loading your bag…</p>
      </div>
    );
  }

  const subtotal = resolved.reduce((sum, r) => sum + r.product.price * r.line.quantity, 0);
  const mrpTotal = resolved.reduce((sum, r) => sum + (r.product.mrp ?? r.product.price) * r.line.quantity, 0);
  const savings = mrpTotal - subtotal;
  const buddyCoinsTotal = resolved.reduce((sum, r) => sum + (r.product.buddyCoins ?? 0) * r.line.quantity, 0);
  const couponDiscount = applied?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - couponDiscount);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!coupon.trim()) return;
    setApplyingCoupon(true);
    setCouponMessage(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.trim(), subtotal }),
      });
      const data = await res.json();
      if (!data.valid) {
        setApplied(null);
        setCouponMessage(data.reason || "That coupon code isn't valid.");
        return;
      }
      setApplied({ code: coupon.trim().toUpperCase(), discountAmount: data.discountAmount });
      setCouponMessage(`Coupon applied — $${data.discountAmount.toFixed(2)} off.`);
    } catch {
      setCouponMessage("Couldn't validate that coupon. Try again.");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    clearCoupon();
    setCoupon("");
    setCouponMessage(null);
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mb-6 mt-2 text-xl font-semibold text-text-primary md:text-2xl">
        My Bag {resolved.length > 0 && <span className="text-sm font-normal text-text-muted">({resolved.length} items)</span>}
      </h1>

      {resolved.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-base font-semibold text-text-primary">Your bag is empty</p>
          <p className="mt-1 text-sm text-text-muted">Looks like you haven&apos;t added anything yet.</p>
          <Link
            href="/shop"
            className="btn-tracking mt-5 rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 divide-y divide-border rounded-md border border-border">
            {resolved.map(({ line, product }) => (
              <div key={`${line.productId}-${line.option ?? ""}`} className="flex gap-4 p-4">
                <Link
                  href={`/product/${product.slug}`}
                  className="h-24 w-20 shrink-0 overflow-hidden rounded-md border border-border"
                  style={{ backgroundColor: product.swatch }}
                >
                  {product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/product/${product.slug}`} className="font-bold text-text-primary hover:text-accent">
                        {product.name}
                      </Link>
                      {line.option && <p className="mt-0.5 text-xs text-text-muted">Option: {line.option}</p>}
                    </div>
                    <p className="font-bold text-text-primary">${(product.price * line.quantity).toFixed(2)}</p>
                  </div>

                  <div className="mt-auto flex items-center gap-4 pt-3">
                    <div className="flex items-center rounded-md border border-border-strong">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, line.option, line.quantity - 1)}
                        className="px-2.5 py-1 text-text-secondary hover:text-accent"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, line.option, line.quantity + 1)}
                        className="px-2.5 py-1 text-text-secondary hover:text-accent"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveForLater(line.productId, line.option, line.quantity)}
                      className="text-xs font-semibold text-text-secondary hover:text-accent"
                    >
                      Save for Later
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleWishlist(product.id);
                        removeItem(line.productId, line.option);
                      }}
                      className="text-xs font-semibold text-text-secondary hover:text-accent"
                    >
                      Move to Wishlist
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(line.productId, line.option)}
                      className="text-xs font-semibold text-text-secondary hover:text-discount"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full shrink-0 lg:w-80">
            <div className="sticky top-24 rounded-md border border-border p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Price Details</p>
              <div className="space-y-2 text-sm">
                {savings > 0 && (
                  <>
                    <div className="flex justify-between text-text-secondary">
                      <span>Total MRP</span>
                      <span>${mrpTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-price-note">
                      <span>Discount on MRP</span>
                      <span>− ${savings.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  <span className="text-price-note">FREE</span>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-muted">
                  Have a coupon?
                </label>
                {applied ? (
                  <div className="flex items-center justify-between rounded-md border border-border-strong px-3 py-1.5 text-sm">
                    <span className="font-semibold text-accent-ink">{applied.code} applied</span>
                    <button type="button" onClick={handleRemoveCoupon} className="text-xs font-semibold text-text-secondary hover:text-discount">
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Enter code"
                      className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon}
                      className="shrink-0 rounded-md border border-border-strong px-3 text-sm font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                    >
                      {applyingCoupon ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponMessage && <p className="mt-2 text-xs text-text-secondary">{couponMessage}</p>}
              </div>

              {buddyCoinsTotal > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-soft px-3 py-2 text-sm font-medium text-accent-ink">
                  <CoinIcon className="h-4 w-4" />
                  Earn {buddyCoinsTotal} Buddy Coins on this order
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm text-price-note">
                  <span>Coupon discount</span>
                  <span>− ${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between text-base font-bold text-text-primary ${couponDiscount > 0 ? "mt-2" : "mt-4 border-t border-border pt-4"}`}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <Link
                href="/checkout"
                className="btn-tracking mt-4 block rounded-md bg-accent py-3 text-center text-sm font-bold uppercase text-white hover:opacity-90"
              >
                Place Order
              </Link>
            </div>
          </div>
        </div>
      )}

      {resolvedSaved.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            Saved for Later <span className="text-sm font-normal text-text-muted">({resolvedSaved.length} items)</span>
          </h2>
          <div className="divide-y divide-border rounded-md border border-border lg:max-w-[calc(66.666%-1rem)]">
            {resolvedSaved.map(({ line, product }) => (
              <div key={`${line.productId}-${line.option ?? ""}`} className="flex gap-4 p-4">
                <Link
                  href={`/product/${product.slug}`}
                  className="h-24 w-20 shrink-0 overflow-hidden rounded-md border border-border"
                  style={{ backgroundColor: product.swatch }}
                >
                  {product.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/product/${product.slug}`} className="font-bold text-text-primary hover:text-accent">
                        {product.name}
                      </Link>
                      {line.option && <p className="mt-0.5 text-xs text-text-muted">Option: {line.option}</p>}
                    </div>
                    <p className="font-bold text-text-primary">${(product.price * line.quantity).toFixed(2)}</p>
                  </div>

                  <div className="mt-auto flex items-center gap-4 pt-3">
                    <button
                      type="button"
                      onClick={() => handleMoveToCart(line.productId, line.option, line.quantity)}
                      disabled={product.inStock === false}
                      className="text-xs font-semibold text-accent-ink hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
                    >
                      {product.inStock === false ? "Out of stock" : "Move to Cart"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSaved(line.productId, line.option)}
                      className="text-xs font-semibold text-text-secondary hover:text-discount"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
