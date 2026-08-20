"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminProductRow } from "@/lib/admin-products";
import type { CjOrderResult } from "@/lib/cj-orders";

interface ShippingOption {
  method: string;
  cost: number;
  agingText: string;
}

export default function AdminOrdersPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [productDbId, setProductDbId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("Test Customer");
  const [countryCode, setCountryCode] = useState("US");
  const [country, setCountry] = useState("United States");
  const [province, setProvince] = useState("NY");
  const [city, setCity] = useState("New York");
  const [address, setAddress] = useState("123 Test St");
  const [zip, setZip] = useState("10001");

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [logisticName, setLogisticName] = useState("");
  const [loadingShipping, setLoadingShipping] = useState(false);

  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<CjOrderResult[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data: AdminProductRow[]) => {
        setProducts(data);
        if (data[0]) setProductDbId(data[0].id);
      });
  }, []);

  async function loadShippingOptions() {
    if (!productDbId || !zip) return;
    setLoadingShipping(true);
    setShippingOptions([]);
    setLogisticName("");
    try {
      const res = await fetch(
        `/api/shipping-estimate?productId=${productDbId}&zip=${encodeURIComponent(zip)}&country=${countryCode}&quantity=${quantity}`
      );
      const data = await res.json();
      if (res.ok) {
        setShippingOptions(data);
        if (data[0]) setLogisticName(data[0].method);
      } else {
        setMessage(`Shipping lookup failed: ${data.error}`);
      }
    } finally {
      setLoadingShipping(false);
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!logisticName) {
      setMessage("Look up shipping options and pick a carrier first.");
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productDbId,
          quantity,
          logisticName,
          shipping: { customerName, countryCode, country, province, city, address, zip },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setOrders((prev) => [data.order, ...prev]);
      setMessage(`Order created: ${data.order.orderNumber}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(orderId: string, action: "confirm" | "simulate-pay" | "advance-status" | "cancel", targetStatus?: number) {
    setBusyId(orderId);
    try {
      if (action === "cancel") {
        await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      } else if (action === "confirm") {
        // CREATED -> UNPAID; required before simulate-pay will accept the order
        await fetch(`/api/admin/orders/${orderId}/confirm`, { method: "POST" });
      } else if (action === "simulate-pay") {
        await fetch(`/api/admin/orders/${orderId}/simulate-pay`, { method: "POST" });
      } else {
        await fetch(`/api/admin/orders/${orderId}/advance-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetStatus }),
        });
      }
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const detail = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, orderStatus: (detail as { orderStatus?: string }).orderStatus ?? o.orderStatus } : o))
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">CJ Order Testing (Sandbox)</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      <div className="mb-6 rounded-md border border-dashed border-discount bg-surface-soft px-4 py-3 text-sm text-text-secondary">
        Every order created here is sandboxed (CJ_ORDERS_SANDBOX in .env.local) — no real charge, no
        real shipment. This is an internal testing tool, not connected to the live checkout flow.
      </div>

      <form onSubmit={handleCreateOrder} className="mb-8 space-y-4 rounded-md border border-border p-4">
        <div className="grid grid-cols-2 gap-3">
          <select
            value={productDbId}
            onChange={(e) => setProductDbId(e.target.value)}
            className="col-span-2 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn} — ${p.priceMin?.toFixed(2)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Quantity"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="Country code (US)"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country name"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Province/State"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className="col-span-2 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP/postal code"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={loadShippingOptions}
            disabled={loadingShipping}
            className="rounded-md border border-border-strong px-3 py-2 text-sm font-semibold text-text-primary hover:border-accent disabled:opacity-60"
          >
            {loadingShipping ? "Looking up..." : "Get shipping options"}
          </button>
        </div>

        {shippingOptions.length > 0 && (
          <select
            value={logisticName}
            onChange={(e) => setLogisticName(e.target.value)}
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {shippingOptions.map((o) => (
              <option key={o.method} value={o.method}>
                {o.method} — ${o.cost.toFixed(2)} · {o.agingText} days
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          disabled={creating}
          className="btn-tracking w-full rounded-md bg-accent py-2.5 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create Sandbox Order"}
        </button>
        {message && <p className="text-sm text-text-secondary">{message}</p>}
      </form>

      {orders.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {orders.map((o) => (
            <div key={o.orderId} className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-text-primary">{o.orderNumber}</p>
                  <p className="text-xs text-text-muted">
                    id {o.orderId} · status {o.orderStatus ?? "CREATED"} · {o.isSandbox ? "sandbox" : "LIVE"}
                  </p>
                </div>
                <p className="text-sm text-text-secondary">
                  ${o.productAmount?.toFixed(2) ?? "?"} + ${o.postageAmount?.toFixed(2) ?? "?"} shipping
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === o.orderId}
                  onClick={() => handleAction(o.orderId, "confirm")}
                  className="rounded-md border border-border-strong px-3 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={busyId === o.orderId}
                  onClick={() => handleAction(o.orderId, "simulate-pay")}
                  className="rounded-md border border-border-strong px-3 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                >
                  Simulate Pay
                </button>
                {[400, 500, 600, 700].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busyId === o.orderId}
                    onClick={() => handleAction(o.orderId, "advance-status", s)}
                    className="rounded-md border border-border-strong px-3 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                  >
                    → {s}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busyId === o.orderId}
                  onClick={() => handleAction(o.orderId, "cancel")}
                  className="rounded-md border border-border-strong px-3 py-1 text-xs font-semibold text-discount hover:border-discount disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
