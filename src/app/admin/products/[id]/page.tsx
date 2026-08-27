"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { AdminProductDetail } from "@/lib/admin-products";
import type { ProductImageRow } from "@/lib/product-images";
import type { ProductVideoRow } from "@/lib/product-videos";

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

  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [videos, setVideos] = useState<ProductVideoRow[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

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

  async function loadMedia() {
    const [imagesRes, videosRes] = await Promise.all([
      fetch(`/api/admin/products/${id}/images`),
      fetch(`/api/admin/products/${id}/videos`),
    ]);
    if (imagesRes.ok) setImages(await imagesRes.json());
    if (videosRes.ok) setVideos(await videosRes.json());
  }

  useEffect(() => {
    load();
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load on mount
  }, [id]);

  async function handleAddImage() {
    const file = imageInputRef.current?.files?.[0];
    if (!file) return;
    setMediaBusy(true);
    setMediaMessage(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/admin/products/${id}/images`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMediaMessage(`Failed: ${data.error}`);
        return;
      }
      if (imageInputRef.current) imageInputRef.current.value = "";
      await Promise.all([loadMedia(), load()]);
    } finally {
      setMediaBusy(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    setMediaBusy(true);
    setMediaMessage(null);
    try {
      await fetch(`/api/admin/products/${id}/images/${imageId}`, { method: "DELETE" });
      await Promise.all([loadMedia(), load()]);
    } finally {
      setMediaBusy(false);
    }
  }

  async function handleCheckCjVideo() {
    setMediaBusy(true);
    setMediaMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${id}/sync-video`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMediaMessage(`Failed: ${data.error}`);
        return;
      }
      setMediaMessage(
        data.synced > 0
          ? `Synced ${data.synced} free video(s) from CJ.`
          : data.found > 0
            ? `CJ has ${data.found} video(s) for this product, but none are free to use.`
            : "CJ has no video for this product."
      );
      await loadMedia();
    } finally {
      setMediaBusy(false);
    }
  }

  async function handleUploadVideo() {
    const file = videoInputRef.current?.files?.[0];
    if (!file) return;
    setMediaBusy(true);
    setMediaMessage(null);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch(`/api/admin/products/${id}/video`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMediaMessage(`Failed: ${data.error}`);
        return;
      }
      if (videoInputRef.current) videoInputRef.current.value = "";
      await loadMedia();
    } finally {
      setMediaBusy(false);
    }
  }

  async function handleDeleteVideo(videoId: string) {
    setMediaBusy(true);
    setMediaMessage(null);
    try {
      await fetch(`/api/admin/products/${id}/videos/${videoId}`, { method: "DELETE" });
      await loadMedia();
    } finally {
      setMediaBusy(false);
    }
  }

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

      <div className="mt-6 rounded-md border border-border p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Photos</p>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                {img.source}
              </span>
              <button
                type="button"
                disabled={mediaBusy}
                onClick={() => handleDeleteImage(img.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white hover:bg-discount disabled:opacity-60"
                aria-label="Delete photo"
              >
                ×
              </button>
            </div>
          ))}
          {images.length === 0 && <p className="text-sm text-text-muted">No photos.</p>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            onChange={handleAddImage}
            disabled={mediaBusy}
            className="hidden"
          />
          <button
            type="button"
            disabled={mediaBusy}
            onClick={() => imageInputRef.current?.click()}
            className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            + Add Photo
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Videos</p>
        <div className="flex flex-col gap-2">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-md border border-border p-2">
              <video src={v.videoUrl} poster={v.coverUrl ?? undefined} controls className="h-20 w-32 rounded bg-black object-cover" />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                  v.source === "admin" ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-text-muted"
                }`}
              >
                {v.source}
              </span>
              <button
                type="button"
                disabled={mediaBusy}
                onClick={() => handleDeleteVideo(v.id)}
                className="ml-auto shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-discount hover:border-discount disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          ))}
          {videos.length === 0 && <p className="text-sm text-text-muted">No video yet.</p>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={mediaBusy}
            onClick={handleCheckCjVideo}
            className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
          >
            Check CJ for video
          </button>
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            onChange={handleUploadVideo}
            disabled={mediaBusy}
            className="hidden"
          />
          <button
            type="button"
            disabled={mediaBusy}
            onClick={() => videoInputRef.current?.click()}
            className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            + Upload Video
          </button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          An uploaded video always takes priority over a CJ-synced one on the storefront. Delete any video here,
          CJ-sourced or uploaded, if you don&apos;t want it shown.
        </p>
        {mediaMessage && <p className="mt-2 text-sm text-text-secondary">{mediaMessage}</p>}
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
