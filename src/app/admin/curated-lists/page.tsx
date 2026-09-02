"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminProductRow } from "@/lib/admin-products";
import type { CuratedListItemAdmin } from "@/lib/curated-lists";

const LISTS = [
  { key: "deal-of-the-day", label: "Deal of the Day", description: "Homepage featured banner. Only the first product shows there -- reorder to change which one." },
  { key: "hot-deals", label: "Hot Deals", description: "Every product added here shows on the /deals page." },
  { key: "trending-deals", label: "Trending Deals", description: "Homepage rail, in this order." },
  { key: "new-in", label: "New In", description: "Homepage rail, in this order." },
] as const;

export default function CuratedListsPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [items, setItems] = useState<Record<string, CuratedListItemAdmin[]>>({});
  const [search, setSearch] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadAll() {
    const [productsRes, ...listResponses] = await Promise.all([
      fetch("/api/admin/products"),
      ...LISTS.map((l) => fetch(`/api/admin/curated-lists/${l.key}`)),
    ]);
    setProducts(await productsRes.json());
    const next: Record<string, CuratedListItemAdmin[]> = {};
    for (let i = 0; i < LISTS.length; i++) {
      next[LISTS[i].key] = await listResponses[i].json();
    }
    setItems(next);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load on mount
  }, []);

  async function handleAdd(listKey: string, productId: string) {
    setBusyKey(listKey);
    try {
      await fetch(`/api/admin/curated-lists/${listKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      setSearch((s) => ({ ...s, [listKey]: "" }));
      await loadAll();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(listKey: string, productId: string) {
    setBusyKey(listKey);
    try {
      await fetch(`/api/admin/curated-lists/${listKey}/${productId}`, { method: "DELETE" });
      await loadAll();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleMove(listKey: string, index: number, direction: -1 | 1) {
    const current = items[listKey] ?? [];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= current.length) return;
    const reordered = [...current];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setBusyKey(listKey);
    try {
      await fetch(`/api/admin/curated-lists/${listKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: reordered.map((i) => i.productId) }),
      });
      await loadAll();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Curated Lists</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      {LISTS.map((list) => {
        const listItems = items[list.key] ?? [];
        const currentIds = new Set(listItems.map((i) => i.productId));
        const query = (search[list.key] ?? "").trim().toLowerCase();
        const matches = query
          ? products.filter((p) => !currentIds.has(p.id) && p.nameEn.toLowerCase().includes(query)).slice(0, 6)
          : [];
        const busy = busyKey === list.key;

        return (
          <div key={list.key} className="mb-6 rounded-md border border-border p-4">
            <p className="text-sm font-bold text-text-primary">{list.label}</p>
            <p className="mb-3 text-xs text-text-muted">{list.description}</p>

            <div className="flex flex-col gap-2">
              {listItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border bg-surface-grey">
                    {item.mainImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.mainImageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{item.nameEn}</p>
                  <button
                    type="button"
                    disabled={busy || idx === 0}
                    onClick={() => handleMove(list.key, idx, -1)}
                    className="shrink-0 rounded border border-border-strong px-2 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || idx === listItems.length - 1}
                    onClick={() => handleMove(list.key, idx, 1)}
                    className="shrink-0 rounded border border-border-strong px-2 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemove(list.key, item.productId)}
                    className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-discount hover:border-discount disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {listItems.length === 0 && <p className="text-sm text-text-muted">No products yet -- nothing shows on the storefront for this until you add some.</p>}
            </div>

            <div className="relative mt-3">
              <input
                type="text"
                value={search[list.key] ?? ""}
                onChange={(e) => setSearch((s) => ({ ...s, [list.key]: e.target.value }))}
                placeholder="Search your products to add..."
                disabled={busy}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              {matches.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-white shadow-lg">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAdd(list.key, p.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-grey"
                    >
                      {p.mainImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.mainImageUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
                      )}
                      <span className="truncate">{p.nameEn}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
