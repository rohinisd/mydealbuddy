"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/orders";

const STATUS_STYLES: Record<Order["status"], string> = {
  paid: "bg-surface-soft text-accent-ink",
  pending_payment: "bg-surface-grey text-text-muted",
  cancelled: "bg-surface-grey text-text-muted",
  refunded: "bg-discount/10 text-discount",
};

export default function AdminCustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/customer-orders");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefund(order: Order) {
    if (
      !confirm(
        `Refund ${order.orderNumber} for $${order.total.toFixed(2)} via PayPal? This also claws back any Buddy Coins credited for this order. Cannot be undone.`
      )
    )
      return;
    setBusyId(order.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/customer-orders/${order.id}/refund`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Refund failed: ${data.error}`);
        return;
      }
      setMessage(`Refunded ${order.orderNumber}.`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Customer Orders</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      {message && <p className="mb-4 text-sm text-text-secondary">{message}</p>}

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-text-muted">No orders yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {orders.map((o) => (
            <div key={o.id} className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{o.orderNumber}</p>
                  <p className="truncate text-xs text-text-muted">
                    {o.shippingEmail} · {new Date(o.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">
                    {o.paypalOrderId ? `PayPal order ${o.paypalOrderId}` : "no payment"}
                    {o.paypalCaptureId ? ` · capture ${o.paypalCaptureId}` : ""}
                    {o.paypalRefundId ? ` · refund ${o.paypalRefundId}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                    {o.status}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-text-primary">${o.total.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-text-muted">
                {o.lines.map((l) => `${l.productName} × ${l.quantity}`).join(", ")}
              </p>
              {o.status === "paid" && o.paypalCaptureId && (
                <button
                  type="button"
                  disabled={busyId === o.id}
                  onClick={() => handleRefund(o)}
                  className="rounded-md border border-discount px-3 py-1 text-xs font-semibold text-discount hover:bg-discount/10 disabled:opacity-60"
                >
                  {busyId === o.id ? "Refunding..." : "Refund via PayPal"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
