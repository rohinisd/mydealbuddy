"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_CATEGORIES } from "@/data/categories";
import type { AdminProductRow } from "@/lib/admin-products";

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]?.slug ?? "");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage(`Added: ${data.product.nameEn}`);
      setInput("");
      await loadProducts();
    } finally {
      setAdding(false);
    }
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

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Product Admin</h1>
        <button onClick={handleLogout} className="text-sm font-semibold text-text-secondary hover:text-accent">
          Log out
        </button>
      </div>

      <form onSubmit={handleAdd} className="mb-8 flex flex-wrap gap-2 rounded-md border border-border p-4">
        <input
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="CJ product link or pid"
          className="min-w-[280px] flex-1 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={adding}
          className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add Product"}
        </button>
        {message && <p className="w-full text-sm text-text-secondary">{message}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-text-muted">No products yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-grey">
                {p.mainImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mainImageUrl} alt={p.nameEn} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{p.nameEn}</p>
                <p className="text-xs text-text-muted">
                  {p.appCategorySlug ?? "uncategorized"} · ${p.priceMin?.toFixed(2) ?? "—"} · pid {p.pid}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  p.isActive ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-text-muted"
                }`}
              >
                {p.isActive ? "Active" : "Inactive"}
              </span>
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
