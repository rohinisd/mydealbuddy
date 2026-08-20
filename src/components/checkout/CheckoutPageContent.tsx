"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { useCart } from "@/context/CartContext";
import { useCoupon } from "@/context/CouponContext";
import { useProductsByIds } from "@/hooks/useProductsByIds";

export function CheckoutPageContent() {
  const { lines } = useCart();
  const { applied } = useCoupon();
  const [placed, setPlaced] = useState(false);

  const { products, loading } = useProductsByIds(lines.map((l) => l.productId));
  const productById = new Map(products.map((p) => [p.id, p]));
  const resolved = lines
    .map((line) => ({ line, product: productById.get(line.productId) }))
    .filter((r): r is { line: typeof lines[number]; product: NonNullable<typeof r.product> } => !!r.product);
  const subtotal = resolved.reduce((sum, r) => sum + r.product.price * r.line.quantity, 0);
  const couponDiscount = applied?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - couponDiscount);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <p className="py-20 text-center text-sm text-text-muted">Loading checkout…</p>
      </div>
    );
  }

  if (resolved.length === 0 && !placed) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-base font-semibold text-text-primary">Your bag is empty</p>
          <p className="mt-1 text-sm text-text-muted">Add something to your bag before checking out.</p>
          <Link
            href="/shop"
            className="btn-tracking mt-5 rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-lg font-bold text-text-primary">This is a preview checkout</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Real payment processing (Stripe / PayPal) isn&apos;t connected yet — no order was actually placed
            and no payment was charged. This screen shows what the confirmation step will look like once
            live payment credentials are added.
          </p>
          <Link
            href="/shop"
            className="btn-tracking mt-5 rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-6 mt-2 text-xl font-semibold text-text-primary md:text-2xl">Checkout</h1>

      <div className="rounded-md border border-dashed border-discount bg-surface-soft px-4 py-3 text-sm text-text-secondary">
        Preview mode — Stripe/PayPal aren&apos;t connected yet, so this form doesn&apos;t process a real
        payment. It exists to validate the flow and layout ahead of wiring up live credentials.
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <form
          className="flex-1 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setPlaced(true);
          }}
        >
          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">Billing Details</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input required placeholder="First name" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
              <input required placeholder="Last name" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
              <input required placeholder="Email address" type="email" className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none" />
              <input required placeholder="Address" className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none" />
              <input required placeholder="City" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
              <input required placeholder="ZIP code" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>
          </fieldset>

          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">Payment Method</legend>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 text-text-muted">
                <input type="radio" name="payment" disabled /> Credit / Debit Card (Stripe) — connect credentials to enable
              </label>
              <label className="flex items-center gap-2 text-text-muted">
                <input type="radio" name="payment" disabled /> PayPal — connect credentials to enable
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn-tracking w-full rounded-md bg-accent py-3 text-sm font-bold uppercase text-white hover:opacity-90"
          >
            Place Order (Preview)
          </button>
        </form>

        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-24 rounded-md border border-border p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Order Summary</p>
            <ul className="space-y-2 text-sm text-text-secondary">
              {resolved.map(({ line, product }) => (
                <li key={`${line.productId}-${line.option ?? ""}`} className="flex justify-between">
                  <span className="truncate pr-2">
                    {product.name} × {line.quantity}
                  </span>
                  <span className="shrink-0 font-medium text-text-primary">${(product.price * line.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {couponDiscount > 0 && (
              <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm text-price-note">
                <span>Coupon ({applied?.code})</span>
                <span>− ${couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className={`flex justify-between text-base font-bold text-text-primary ${couponDiscount > 0 ? "mt-2" : "mt-4 border-t border-border pt-4"}`}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
