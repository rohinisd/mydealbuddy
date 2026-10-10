"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CategoryPicker } from "@/components/admin/CategoryPicker";
import { CategoryFilter } from "@/components/admin/CategoryFilter";
import type { AdminProductRow } from "@/lib/admin-products";
import { buildPricingCsv } from "@/lib/pricing-csv";
import type { ImportPricingCsvResult } from "@/app/api/admin/products/import-pricing-csv/route";

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
  const [message, setMessage] = useState<string | null>(null);
  const [needsPriceOnly, setNeedsPriceOnly] = useState(false);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [markupPctInputs, setMarkupPctInputs] = useState<Record<string, string>>({});
  const [markupDollarInputs, setMarkupDollarInputs] = useState<Record<string, string>>({});
  const [fetchingShippingId, setFetchingShippingId] = useState<string | null>(null);
  const [bulkShippingFetching, setBulkShippingFetching] = useState(false);
  const [bulkShippingProgress, setBulkShippingProgress] = useState<{ done: number; total: number } | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState<ImportPricingCsvResult | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [categoryLeafFilter, setCategoryLeafFilter] = useState<Set<string> | null>(null);

  async function loadProducts() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        setMessage(`Failed to load products (${res.status}).`);
        return;
      }
      const data: AdminProductRow[] = await res.json();
      setProducts(data);
      setPriceInputs(Object.fromEntries(data.map((p) => [p.id, p.overridePrice != null ? String(p.overridePrice) : ""])));
    } catch {
      setMessage("Failed to load products -- network error.");
    } finally {
      setLoading(false);
    }
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

  function handleMarkupPctChange(product: AdminProductRow, totalCost: number | null, value: string) {
    setMarkupPctInputs((prev) => ({ ...prev, [product.id]: value }));
    const pct = Number(value);
    if (totalCost != null && value.trim() !== "" && !Number.isNaN(pct)) {
      setPriceInputs((prev) => ({ ...prev, [product.id]: (totalCost * (1 + pct / 100)).toFixed(2) }));
    }
  }

  function handleMarkupDollarChange(product: AdminProductRow, totalCost: number | null, value: string) {
    setMarkupDollarInputs((prev) => ({ ...prev, [product.id]: value }));
    const amt = Number(value);
    if (totalCost != null && value.trim() !== "" && !Number.isNaN(amt)) {
      setPriceInputs((prev) => ({ ...prev, [product.id]: (totalCost + amt).toFixed(2) }));
    }
  }

  async function handleSavePrice(product: AdminProductRow) {
    const trimmed = (priceInputs[product.id] ?? "").trim();
    const overridePrice = trimmed === "" ? null : Number(trimmed);
    if (overridePrice !== null && (Number.isNaN(overridePrice) || overridePrice <= 0)) {
      setMessage("Enter a valid price greater than 0, or leave it blank to use CJ's suggested price.");
      return;
    }
    setBusyId(product.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overridePrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to save price.");
        return;
      }
      await loadProducts();
    } finally {
      setBusyId(null);
    }
  }

  async function handleFetchShipping(product: AdminProductRow) {
    setFetchingShippingId(product.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/shipping-cost`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to fetch shipping estimate.");
        return;
      }
      await loadProducts();
    } finally {
      setFetchingShippingId(null);
    }
  }

  // CJ's freight API is QPS=1 (same constraint as handleBulkAdd above), so
  // this runs strictly one product at a time from the browser rather than as
  // a single backend request that would blow past Vercel's function limit.
  async function handleBulkFetchShipping() {
    const targets = products.filter((p) => p.cachedShippingCost == null);
    if (targets.length === 0) return;

    setBulkShippingFetching(true);
    setMessage(null);
    setBulkShippingProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      setFetchingShippingId(targets[i].id);
      try {
        await fetch(`/api/admin/products/${targets[i].id}/shipping-cost`, { method: "POST" });
      } catch {
        // A single CJ hiccup shouldn't abort the rest of the batch.
      }
      setBulkShippingProgress({ done: i + 1, total: targets.length });
    }

    setFetchingShippingId(null);
    setBulkShippingFetching(false);
    setBulkShippingProgress(null);
    await loadProducts();
  }

  // Builds the CSV straight from already-loaded state -- the admin page
  // already fetched every product's cost/shipping/suggested price, so there's
  // no reason to round-trip the server just to export what's sitting in memory.
  function handleExportCsv() {
    const target = visibleProducts.filter((p) => p.overridePrice == null);
    const csv = buildPricingCsv(
      target.map((p) => ({
        id: p.id,
        name: p.nameEn,
        category: p.categoryLabel,
        pid: p.pid,
        cjCost: p.costPrice,
        shippingCost: p.cachedShippingCost,
        priceMin: p.priceMin,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mydealbuddy-needs-final-price-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same filename after a fix
    if (!file) return;

    setImportingCsv(true);
    setImportResult(null);
    setMessage(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/products/import-pricing-csv", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to import CSV.");
        return;
      }
      setImportResult(data);
      await loadProducts();
    } catch {
      setMessage("Failed to import CSV -- network error.");
    } finally {
      setImportingCsv(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function handleDelete(product: AdminProductRow) {
    if (!confirm(`Delete "${product.nameEn}" permanently? This removes its images, videos, and reviews too. Cannot be undone.`)) {
      return;
    }
    setBusyId(product.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to delete product.");
        return;
      }
      await loadProducts();
    } finally {
      setBusyId(null);
    }
  }

  const categoryFilteredProducts = categoryLeafFilter ? products.filter((p) => p.categoryId != null && categoryLeafFilter.has(p.categoryId)) : products;
  const visibleProducts = needsPriceOnly ? categoryFilteredProducts.filter((p) => p.overridePrice == null) : categoryFilteredProducts;
  const needsPriceCount = categoryFilteredProducts.filter((p) => p.overridePrice == null).length;

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
          <Link href="/admin/campaigns" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Campaigns →
          </Link>
          <Link href="/admin/videos" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Videos →
          </Link>
          <Link href="/admin/contact-messages" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Contact Messages →
          </Link>
          <Link href="/admin/account-health" className="text-sm font-semibold text-text-secondary hover:text-accent">
            Account Health →
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

      {(products.length > 0 || message) && (
        <div className="mb-3 flex items-center justify-between">
          {products.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <CategoryFilter onChange={setCategoryLeafFilter} />
              <button
                type="button"
                onClick={() => setNeedsPriceOnly((v) => !v)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                  needsPriceOnly ? "border-discount bg-discount text-white" : "border-border-strong text-text-primary hover:border-accent"
                }`}
              >
                {needsPriceOnly ? "Showing: Needs Final Price" : `Needs Final Price (${needsPriceCount})`}
              </button>
              {products.some((p) => p.cachedShippingCost == null) && (
                <button
                  type="button"
                  disabled={bulkShippingFetching}
                  onClick={handleBulkFetchShipping}
                  className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                >
                  {bulkShippingFetching && bulkShippingProgress
                    ? `Fetching shipping… (${bulkShippingProgress.done}/${bulkShippingProgress.total})`
                    : "Fetch All Shipping Costs"}
                </button>
              )}
              {needsPriceOnly && needsPriceCount > 0 && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent"
                >
                  Export CSV
                </button>
              )}
              <button
                type="button"
                disabled={importingCsv}
                onClick={() => csvFileInputRef.current?.click()}
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
              >
                {importingCsv ? "Importing…" : "Import Priced CSV"}
              </button>
              <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportCsv} className="hidden" />
            </div>
          ) : (
            <div />
          )}
          {message && <p className="text-sm text-discount">{message}</p>}
        </div>
      )}

      {importResult && (
        <div className="mb-4 rounded-md border border-border bg-surface-grey p-3 text-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="font-semibold text-text-primary">
              CSV import: {importResult.applied.length} price{importResult.applied.length === 1 ? "" : "s"} applied
              {importResult.skippedBlankCount > 0 ? `, ${importResult.skippedBlankCount} left blank (skipped)` : ""}
              {importResult.errors.length > 0 ? `, ${importResult.errors.length} failed` : ""}
            </p>
            <button type="button" onClick={() => setImportResult(null)} className="text-xs text-text-muted hover:text-accent">
              Dismiss
            </button>
          </div>
          {importResult.warnings.length > 0 && (
            <ul className="mb-1.5 space-y-0.5">
              {importResult.warnings.map((w, i) => (
                <li key={i} className="text-xs text-discount">
                  ⚠ {w.name}: {w.message}
                </li>
              ))}
            </ul>
          )}
          {importResult.errors.length > 0 && (
            <ul className="space-y-0.5">
              {importResult.errors.map((err, i) => (
                <li key={i} className="text-xs text-discount">
                  ✗ Row {err.rowNum > 0 ? err.rowNum : "?"}{err.id ? ` (id ${err.id})` : ""}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-text-muted">No products yet.</p>
      ) : visibleProducts.length === 0 ? (
        <p className="text-sm text-text-muted">Every product already has a final selling price set.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {visibleProducts.map((p) => {
            const totalCost = p.costPrice != null && p.cachedShippingCost != null ? p.costPrice + p.cachedShippingCost : null;
            const enteredPrice = Number(priceInputs[p.id]);
            const effectivePrice = priceInputs[p.id]?.trim() && !Number.isNaN(enteredPrice) ? enteredPrice : p.priceMin;
            const dollarIncrease = totalCost != null && effectivePrice != null ? effectivePrice - totalCost : null;
            const pctIncrease = dollarIncrease != null && totalCost ? (dollarIncrease / totalCost) * 100 : null;

            return (
              <div key={p.id} className="p-3">
                <div className="flex items-center gap-3">
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
                      · CJ suggested ${p.priceMin?.toFixed(2) ?? "—"} · pid {p.pid}
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
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleDelete(p)}
                    className="shrink-0 rounded-md border border-discount px-3 py-1.5 text-xs font-semibold text-discount hover:bg-discount/10 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[60px] text-xs text-text-muted">
                  <span>CJ cost: {p.costPrice != null ? `$${p.costPrice.toFixed(2)}` : "—"}</span>
                  <span className="flex items-center gap-1">
                    Shipping (NJ): {p.cachedShippingCost != null ? `$${p.cachedShippingCost.toFixed(2)}` : <span className="italic">not fetched</span>}
                    <button
                      type="button"
                      disabled={fetchingShippingId === p.id || bulkShippingFetching}
                      onClick={() => handleFetchShipping(p)}
                      className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:border-accent disabled:opacity-60"
                    >
                      {fetchingShippingId === p.id ? "Fetching…" : p.cachedShippingCost != null ? "Refresh" : "Fetch"}
                    </button>
                  </span>
                  <span>Total cost: {totalCost != null ? `$${totalCost.toFixed(2)}` : "—"}</span>
                  <span className="flex items-center gap-1">
                    +
                    <input
                      type="number"
                      step="1"
                      value={markupPctInputs[p.id] ?? ""}
                      onChange={(e) => handleMarkupPctChange(p, totalCost, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePrice(p);
                      }}
                      disabled={totalCost == null}
                      placeholder="40"
                      title={totalCost == null ? "Fetch shipping first to compute this from total cost" : undefined}
                      className="w-12 rounded-md border border-border-strong px-2 py-1 text-xs focus:border-accent focus:outline-none disabled:opacity-50"
                    />
                    % over cost
                  </span>
                  <span className="flex items-center gap-1">
                    or +$
                    <input
                      type="number"
                      step="0.01"
                      value={markupDollarInputs[p.id] ?? ""}
                      onChange={(e) => handleMarkupDollarChange(p, totalCost, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePrice(p);
                      }}
                      disabled={totalCost == null}
                      placeholder="5.00"
                      title={totalCost == null ? "Fetch shipping first to compute this from total cost" : undefined}
                      className="w-14 rounded-md border border-border-strong px-2 py-1 text-xs focus:border-accent focus:outline-none disabled:opacity-50"
                    />
                    over cost
                  </span>
                  <span className="flex items-center gap-1">
                    or Sell price: $
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceInputs[p.id] ?? ""}
                      onChange={(e) => setPriceInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePrice(p);
                      }}
                      placeholder={p.priceMin != null ? p.priceMin.toFixed(2) : "0.00"}
                      className={`w-20 rounded-md border px-2 py-1 text-xs focus:border-accent focus:outline-none ${
                        p.overridePrice == null ? "border-discount" : "border-border-strong"
                      }`}
                    />
                  </span>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleSavePrice(p)}
                    className="rounded-md border border-accent bg-accent px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Save
                  </button>
                  {dollarIncrease != null && pctIncrease != null && (
                    <span className={`font-semibold ${dollarIncrease < 0 ? "text-discount" : "text-accent-ink"}`}>
                      {dollarIncrease >= 0 ? "+" : ""}
                      ${dollarIncrease.toFixed(2)} ({pctIncrease >= 0 ? "+" : ""}
                      {pctIncrease.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
