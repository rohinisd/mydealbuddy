"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Breadcrumb } from "@/components/plp/Breadcrumb";
import { useCart } from "@/context/CartContext";
import { useCoupon } from "@/context/CouponContext";
import { useProductsByIds } from "@/hooks/useProductsByIds";
import { SHIPPING_COUNTRIES } from "@/data/countries";
import { isValidPostalCode } from "@/lib/postal-codes";
import type { Order } from "@/lib/orders";
import type { CustomerAddress } from "@/lib/customer-addresses";

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
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);

  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [estimatedDays, setEstimatedDays] = useState<{ min: number; max: number } | null>(null);
  const [shippingCalculating, setShippingCalculating] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) return;
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((data: CustomerAddress[]) => {
        setSavedAddresses(data);
        const def = data.find((a) => a.isDefault);
        if (def) applyAddress(def);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load on mount
  }, [isGuest]);

  function applyAddress(a: CustomerAddress) {
    setSelectedAddressId(a.id);
    setName(a.fullName);
    setAddress(a.addressLine);
    setCity(a.city);
    setProvince(a.province ?? "");
    setCountryCode(a.countryCode);
    setZip(a.zip ?? "");
    setPhone(a.phone ?? "");
  }

  const linesKey = lines.map((l) => `${l.productId}:${l.quantity}`).join(",");

  useEffect(() => {
    const trimmedZip = zip.trim();
    if (!countryCode || !trimmedZip || lines.length === 0 || !isValidPostalCode(countryCode, trimmedZip)) {
      setShippingCost(null);
      setEstimatedDays(null);
      setShippingError(null);
      return;
    }

    let cancelled = false;
    setShippingCalculating(true);
    setShippingError(null);
    const timer = setTimeout(() => {
      fetch("/api/checkout/shipping-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          countryCode,
          zip: trimmedZip,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.error) {
            setShippingCost(null);
            setEstimatedDays(null);
            setShippingError(data.error);
          } else if (!data.shippable) {
            setShippingCost(null);
            setEstimatedDays(null);
            setShippingError("Some items in your cart can't be shipped to this address.");
          } else {
            setShippingCost(data.total);
            setEstimatedDays(data.estimatedDays ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setShippingCost(null);
            setEstimatedDays(null);
            setShippingError("Couldn't calculate shipping. Try again.");
          }
        })
        .finally(() => {
          if (!cancelled) setShippingCalculating(false);
        });
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- linesKey is the stable dependency, lines itself changes reference every render
  }, [countryCode, zip, linesKey]);

  const { products, loading } = useProductsByIds(lines.map((l) => l.productId));
  const productById = new Map(products.map((p) => [p.id, p]));
  const resolved = lines
    .map((line) => ({ line, product: productById.get(line.productId) }))
    .filter((r): r is { line: typeof lines[number]; product: NonNullable<typeof r.product> } => !!r.product);
  const subtotal = resolved.reduce((sum, r) => sum + r.product.price * r.line.quantity, 0);
  const couponDiscount = applied?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - couponDiscount) + (shippingCost ?? 0);
  const readyForPayment = !shippingCalculating && shippingCost !== null && !shippingError;

  function currentShippingPayload() {
    const country = SHIPPING_COUNTRIES.find((c) => c.code === countryCode)?.label ?? countryCode;
    return {
      lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, option: l.option })),
      couponCode: applied?.code ?? null,
      shipping: { name, email, countryCode, country, province, city, address, zip, phone },
    };
  }

  async function handleCreatePaypalOrder(): Promise<string> {
    if (!formRef.current?.reportValidity()) {
      throw new Error("Please fill in all required fields.");
    }
    setError(null);
    const res = await fetch("/api/checkout/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentShippingPayload()),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong starting PayPal checkout.");
      throw new Error(data.error || "PayPal create order failed");
    }
    return data.paypalOrderId as string;
  }

  async function handleApprovePaypalOrder(paypalOrderId: string) {
    setError(null);
    const res = await fetch("/api/checkout/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong confirming your PayPal payment.");
      return;
    }
    setPlacedOrder(data.order);
    clear();
    clearCoupon();

    if (!isGuest && saveAddress) {
      const { shipping } = currentShippingPayload();
      fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: shipping.name,
          phone: shipping.phone,
          countryCode: shipping.countryCode,
          country: shipping.country,
          province: shipping.province,
          city: shipping.city,
          addressLine: shipping.address,
          zip: shipping.zip,
        }),
      }).catch(() => {});
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
            Paid ${placedOrder.total.toFixed(2)} via PayPal.{" "}
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
        Payment runs through PayPal&apos;s sandbox right now — real API behavior, but no real money moves. Credit
        card via Stripe isn&apos;t connected yet.
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
        <form ref={formRef} className="flex-1 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">Shipping Details</legend>

            {savedAddresses.length > 0 && (
              <select
                value={selectedAddressId}
                onChange={(e) => {
                  const a = savedAddresses.find((addr) => addr.id === e.target.value);
                  if (a) applyAddress(a);
                }}
                className="mb-3 w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="">Use a saved address...</option>
                {savedAddresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label ? `${a.label} — ` : ""}
                    {a.fullName}, {a.addressLine}, {a.city}
                  </option>
                ))}
              </select>
            )}

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
                required
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

            {!isGuest && (
              <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                Save this address to my account
              </label>
            )}
          </fieldset>

          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">Payment Method</legend>
            <p className="mb-3 text-sm text-text-muted">Credit / Debit Card (Stripe) — connect credentials to enable</p>

            {shippingCalculating ? (
              <p className="text-sm text-text-muted">Calculating shipping...</p>
            ) : shippingError ? (
              <p className="text-sm text-discount">Can&apos;t ship to this address.</p>
            ) : shippingCost === null ? (
              <p className="text-sm text-text-muted">Enter your shipping address above to pay with PayPal.</p>
            ) : (
              <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "", currency: "USD" }}>
                <PayPalButtons
                  disabled={!readyForPayment}
                  style={{ layout: "vertical" }}
                  createOrder={handleCreatePaypalOrder}
                  onApprove={async (data) => handleApprovePaypalOrder(data.orderID)}
                  onError={(err) => setError(`PayPal error: ${String(err)}`)}
                />
              </PayPalScriptProvider>
            )}
          </fieldset>

          {error && <p className="text-sm text-discount">{error}</p>}
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
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm text-text-secondary">
              <span>Shipping</span>
              <span>
                {shippingCalculating
                  ? "Calculating..."
                  : shippingError
                    ? "—"
                    : shippingCost !== null
                      ? `$${shippingCost.toFixed(2)}`
                      : "Enter address"}
              </span>
            </div>
            {shippingError && <p className="mt-1 text-xs text-discount">{shippingError}</p>}
            {estimatedDays && (
              <p className="mt-1 text-xs text-text-muted">
                Estimated delivery: {estimatedDays.min}
                {estimatedDays.max !== estimatedDays.min ? `–${estimatedDays.max}` : ""} days
              </p>
            )}
            {couponDiscount > 0 && (
              <div className="mt-2 flex justify-between text-sm text-price-note">
                <span>Coupon ({applied?.code})</span>
                <span>− ${couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-4 text-base font-bold text-text-primary">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
