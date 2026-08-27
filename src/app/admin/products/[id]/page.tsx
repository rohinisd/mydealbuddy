"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { AdminProductDetail } from "@/lib/admin-products";

function formatAttributes(attrs: Record<string, string> | null): string {
  if (!attrs) return "—";
  const entries = Object.entries(attrs);
  return entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join(", ") : "—";
}

export default function AdminProductDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceInput, setPriceInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/products/${id}`);
    if (res.ok) {
      const data: AdminProductDetail = await res.json();
      setProduct(data);
      setPriceInput(data.overridePrice != null ? String(data.overridePrice) : "");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load on mount
  }, [id]);

  async function handleSavePrice() {
    const trimmed = priceInput.trim();
    const overridePrice = trimmed === "" ? null : Number(trimmed);
    if (overridePrice !== null && (Number.isNaN(overridePrice) || overridePrice <= 0)) {
      setMessage("Enter a valid price greater than 0, or leave it blank to use CJ's suggested price.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overridePrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage(overridePrice === null ? "Cleared -- back to CJ's suggested price." : "Saved.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <p className="text-sm text-text-muted">Product not found.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const lowestCost = product.variants
    .map((v) => v.costPrice)
    .filter((c): c is number => c != null)
    .reduce((min, c) => (min === null ? c : Math.min(min, c)), null as number | null);

  const currentPriceNum = priceInput.trim() === "" ? product.priceMin : Number(priceInput);
  const marginPct =
    lowestCost && currentPriceNum && currentPriceNum > 0
      ? Math.round(((currentPriceNum - lowestCost) / currentPriceNum) * 100)
      : null;

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{product.nameEn}</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-md border border-border bg-surface-grey">
          {product.mainImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.mainImageUrl} alt={product.nameEn} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="text-sm text-text-secondary">
          <p>
            <span className="font-semibold text-text-primary">Brand:</span> {product.brand ?? "—"}
          </p>
          <p>
            <span className="font-semibold text-text-primary">Category:</span> {product.appCategorySlug ?? "—"}
          </p>
          <p>
            <span className="font-semibold text-text-primary">CJ pid:</span> {product.pid}
          </p>
          <p>
            <span className="font-semibold text-text-primary">CJ SPU:</span> {product.spu ?? "—"}
          </p>
          <p>
            <span className="font-semibold text-text-primary">CJ suggested price range:</span>{" "}
            {product.priceMin != null ? `$${product.priceMin.toFixed(2)}` : "—"}
            {product.priceMax != null && product.priceMax !== product.priceMin ? ` – $${product.priceMax.toFixed(2)}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Your Selling Price</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder={product.priceMin != null ? product.priceMin.toFixed(2) : "0.00"}
              className="w-36 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSavePrice}
            disabled={saving}
            className="btn-tracking rounded-md bg-accent px-5 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Price"}
          </button>
          {lowestCost != null && marginPct != null && (
            <p className="text-sm text-text-secondary">
              Lowest CJ cost: <span className="font-semibold text-text-primary">${lowestCost.toFixed(2)}</span> · Estimated
              margin:{" "}
              <span className={`font-semibold ${marginPct < 0 ? "text-discount" : "text-accent-ink"}`}>{marginPct}%</span>
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Leave blank to fall back to CJ&apos;s suggested price (${product.priceMin?.toFixed(2) ?? "—"}). Margin is
          estimated against the cheapest variant&apos;s CJ cost, before shipping.
        </p>
        {message && <p className="mt-2 text-sm text-text-secondary">{message}</p>}
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Variants (from CJ)</p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-surface-grey text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Attributes</th>
                <th className="px-3 py-2">CJ Cost</th>
                <th className="px-3 py-2">CJ Suggested Retail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {product.variants.map((v) => (
                <tr key={v.id}>
                  <td className="px-3 py-2 text-text-secondary">{v.variantSku}</td>
                  <td className="px-3 py-2 text-text-secondary">{formatAttributes(v.attributes)}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">
                    {v.costPrice != null ? `$${v.costPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {v.suggestedRetail != null ? `$${v.suggestedRetail.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {product.descriptionHtml && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Description (from CJ)</p>
          <div
            className="prose prose-sm max-w-none rounded-md border border-border p-4 text-sm text-text-secondary [&_img]:max-w-full [&_img]:rounded-md"
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        </div>
      )}
    </div>
  );
}
