"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryPicker } from "@/components/admin/CategoryPicker";
import type { AdminProductRow } from "@/lib/admin-products";

interface BulkAddResult {
  input: string;
  status: "pending" | "success" | "error";
  message: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<BulkAddResult[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // CJ's own API is QPS=1, and syncProductByPid already spaces its internal
  // calls accordingly -- so products just need to go strictly one at a time,
  // awaited in order, with no extra delay between them. Running this loop in
  // the browser (rather than one long backend request) sidesteps Vercel's
  // function duration limit entirely: a batch of 20+ products can take
  // minutes, well past what a single serverless request can survive.
  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const lines = Array.from(new Set(bulkInput.split("\n").map((l) => l.trim()).filter(Boolean)));
    if (lines.length === 0 || !categoryId) return;

    setAdding(true);
    setResults(lines.map((line) => ({ input: line, status: "pending", message: "" })));

    for (let i = 0; i < lines.length; i++) {
      try {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: lines[i], categoryId }),
        });
        const data = await res.json();
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? res.ok
                ? { ...r, status: "success", message: `Added: ${data.product.nameEn}` }
                : { ...r, status: "error", message: data.error || "Failed" }
              : r
          )
        );
      } catch {
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "error", message: "Network error" } : r)));
      }
    }

    setBulkInput("");
    setAdding(false);
    await loadProducts();
  }

  async function toggleActive(product: AdminProductRow) {
    setBusyId(product.id);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      await loadProducts();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBadge(product: AdminProductRow, badge: "deal" | "sale") {
    setBusyId(product.id);
    try {
      const next = product.badges.includes(badge)
        ? product.badges.filter((b) => b !== badge)
        : [...product.badges, badge];
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badges: next }),
      });
      await loadProducts();
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Product Admin</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/coupons" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Coupons →
          </Link>
          <Link href="/admin/customer-orders" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Customer Orders →
          </Link>
          <Link href="/admin/orders" className="text-sm font-semibold text-text-secondary hover:text-accent">
            CJ Sandbox →
          </Link>
          <Link href="/admin/homepage" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Homepage →
          </Link>
          <Link href="/admin/curated-lists" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Curated Lists →
          </Link>
          <Link href="/admin/videos" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Videos →
          </Link>
          <button onClick={handleLogout} className="text-sm font-semibold text-text-secondary hover:text-accent">
            Log out
          </button>
        </div>
      </div>

      <form onSubmit={handleBulkAdd} className="mb-8 flex flex-wrap gap-2 rounded-md border border-border p-4">
        <textarea
          required
          rows={3}
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder={"CJ product link, pid, or SKU -- one per line to add multiple at once"}
          className="min-w-[280px] flex-1 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="flex flex-col gap-2">
          <CategoryPicker value={categoryId} onChange={setCategoryId} disabled={adding} />
          <button
            type="submit"
            disabled={adding || !categoryId}
            className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {adding ? "Adding..." : "Add Product(s)"}
          </button>
        </div>
        <p className="w-full text-xs text-text-muted">All lines in one batch are added under the selected category.</p>
        {results.length > 0 && (
          <ul className="w-full space-y-1 rounded-md border border-border bg-surface-grey p-3 text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span
                  className={
                    r.status === "success" ? "text-accent-ink" : r.status === "error" ? "text-discount" : "text-text-muted"
                  }
                >
                  {r.status === "pending" ? "…" : r.status === "success" ? "✓" : "✗"}
                </span>
                <span className="truncate text-text-secondary">{r.message || r.input}</span>
              </li>
            ))}
          </ul>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-text-muted">No products yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <Link href={`/admin/products/${p.id}`} className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-grey">
                {p.mainImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mainImageUrl} alt={p.nameEn} className="h-full w-full object-cover" />
                )}
              </Link>
              <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary hover:text-accent">{p.nameEn}</p>
                <p className="text-xs text-text-muted">
                  {p.categoryLabel ? (
                    p.categoryLabel
                  ) : (
                    <span className="font-semibold text-discount">Uncategorized</span>
                  )}{" "}
                  · ${(p.overridePrice ?? p.priceMin)?.toFixed(2) ?? "—"}
                  {p.overridePrice != null && <span className="text-accent-ink"> (your price)</span>} · pid {p.pid}
                </p>
              </Link>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  p.isActive ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-text-muted"
                }`}
              >
                {p.isActive ? "Active" : "Inactive"}
              </span>
              <div className="flex shrink-0 gap-1.5">
                {(["deal", "sale"] as const).map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => toggleBadge(p, badge)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-semibold capitalize disabled:opacity-60 ${
                      p.badges.includes(badge)
                        ? "border-accent bg-accent text-white"
                        : "border-border-strong text-text-primary hover:border-accent"
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => toggleActive(p)}
                className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
              >
                {p.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
