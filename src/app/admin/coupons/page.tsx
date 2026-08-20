"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Coupon } from "@/lib/coupons";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadCoupons() {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    setCoupons(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: Number(discountValue),
          minOrderValue: minOrderValue ? Number(minOrderValue) : null,
          maxUses: maxUses ? Number(maxUses) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage(`Created ${data.coupon.code}`);
      setCode("");
      setDiscountValue("");
      setMinOrderValue("");
      setMaxUses("");
      await loadCoupons();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    setBusyId(coupon.id);
    try {
      await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      await loadCoupons();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Coupon Admin</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      <form onSubmit={handleCreate} className="mb-8 grid grid-cols-2 gap-2 rounded-md border border-border p-4 sm:grid-cols-6">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE"
          className="col-span-2 rounded-md border border-border-strong px-3 py-2 text-sm uppercase focus:border-accent focus:outline-none"
        />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
          className="rounded-md border border-border-strong px-2 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="percent">% off</option>
          <option value="fixed">$ off</option>
        </select>
        <input
          required
          type="number"
          step="0.01"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder="Value"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="number"
          step="0.01"
          value={minOrderValue}
          onChange={(e) => setMinOrderValue(e.target.value)}
          placeholder="Min order"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="number"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Max uses"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="btn-tracking col-span-2 rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60 sm:col-span-6"
        >
          {creating ? "Creating..." : "Create Coupon"}
        </button>
        {message && <p className="col-span-2 text-sm text-text-secondary sm:col-span-6">{message}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-text-muted">No coupons yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text-primary">{c.code}</p>
                <p className="text-xs text-text-muted">
                  {c.discountType === "percent" ? `${c.discountValue}% off` : `$${c.discountValue} off`}
                  {c.minOrderValue != null && ` · min $${c.minOrderValue}`}
                  {c.maxUses != null && ` · ${c.timesUsed}/${c.maxUses} used`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  c.isActive ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-text-muted"
                }`}
              >
                {c.isActive ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => toggleActive(c)}
                className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
              >
                {c.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
