"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { useCart } from "@/context/CartContext";
import { useCoupon } from "@/context/CouponContext";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { SHIPPING_COUNTRIES } from "@/data/countries";
import type { Order } from "@/lib/orders";

export function CheckoutPageContent({
  isGuest,
  defaultName,
  defaultEmail,
}: {
  isGuest: boolean;
  defaultName: string;
  defaultEmail: string;
}) {
  const { lines, clear } = useCart();
  const { applied, clear: clearCoupon } = useCoupon();
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");

  const { products, loading } = useProductsByIds(lines.map((l) => l.productId));
  const productById = new Map(products.map((p) => [p.id, p]));
  const resolved = lines
    .map((line) => ({ line, product: productById.get(line.productId) }))
    .filter((r): r is { line: typeof lines[number]; product: NonNullable<typeof r.product> } => !!r.product);
  const subtotal = resolved.reduce((sum, r) => sum + r.product.price * r.line.quantity, 0);
  const couponDiscount = applied?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - couponDiscount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const country = SHIPPING_COUNTRIES.find((c) => c.code === countryCode)?.label ?? countryCode;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, option: l.option })),
          couponCode: applied?.code ?? null,
          shipping: { name, email, countryCode, country, province, city, address, zip, phone },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong placing your order.");
        return;
      }
      setPlacedOrder(data.order);
      clear();
      clearCoupon();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <p className="py-20 text-center text-sm text-text-muted">Loading checkout…</p>
      </div>
    );
  }

  if (resolved.length === 0 && !placedOrder) {
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

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-lg font-bold text-text-primary">Order placed — {placedOrder.orderNumber}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Real payment processing (Stripe / PayPal) isn&apos;t connected yet, so no payment was charged — your
            order is saved as pending payment.{" "}
            {placedOrder.buddyCoinsEarned > 0
              ? `You earned ${placedOrder.buddyCoinsEarned} Buddy Coins on this order.`
              : "Create an account next time to earn Buddy Coins on your orders."}
          </p>
          <div className="mt-5 flex gap-3">
            {isGuest ? (
              <Link
                href={`/signup?next=${encodeURIComponent("/my-account")}`}
                className="btn-tracking rounded-md border border-border-strong px-6 py-2.5 text-sm font-bold uppercase text-text-primary hover:border-accent"
              >
                Create Account
              </Link>
            ) : (
              <Link
                href="/account/orders"
                className="btn-tracking rounded-md border border-border-strong px-6 py-2.5 text-sm font-bold uppercase text-text-primary hover:border-accent"
              >
                View Order
              </Link>
            )}
            <Link
              href="/shop"
              className="btn-tracking rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-6 mt-2 text-xl font-semibold text-text-primary md:text-2xl">Checkout</h1>

      <div className="rounded-md border border-dashed border-discount bg-surface-soft px-4 py-3 text-sm text-text-secondary">
        Real payment processing (Stripe / PayPal) isn&apos;t connected yet, so orders placed here are saved as
        pending payment with no charge. Everything else — the order, your Buddy Coins, and order history — is real.
      </div>

      {isGuest && (
        <div className="mt-3 rounded-md border border-border bg-surface-grey px-4 py-3 text-sm text-text-secondary">
          Checking out as a guest.{" "}
          <Link href={`/login?next=${encodeURIComponent("/checkout")}`} className="font-semibold text-accent hover:underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href={`/signup?next=${encodeURIComponent("/checkout")}`} className="font-semibold text-accent hover:underline">
            create an account
          </Link>{" "}
          to earn Buddy Coins and track this order.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <form className="flex-1 space-y-6" onSubmit={handleSubmit}>
          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">Shipping Details</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
              />
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
                className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
              />
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <input
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Province / State"
                className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                {SHIPPING_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP / postal code"
                className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
              />
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

          {error && <p className="text-sm text-discount">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-tracking w-full rounded-md bg-accent py-3 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Placing Order..." : "Place Order"}
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
