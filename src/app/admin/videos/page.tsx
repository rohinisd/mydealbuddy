"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminProductRow } from "@/lib/admin-products";

interface VideoStatus {
  hasVideo: boolean;
  source: "cj" | "admin" | null;
  videoUrl: string | null;
}

export default function AdminVideosPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, VideoStatus>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    const [productsRes, statusRes] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/products/videos"),
    ]);
    setProducts(await productsRes.json());
    setStatusMap(await statusRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function checkCj(productId: string) {
    setBusyId(productId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/sync-video`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage(
        data.synced > 0
          ? `Synced ${data.synced} free video(s) from CJ.`
          : data.found > 0
            ? `CJ has ${data.found} video(s) for this product, but none are free to use.`
            : "CJ has no video for this product."
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpload(productId: string) {
    const input = fileInputRefs.current[productId];
    const file = input?.files?.[0];
    if (!file) return;
    setBusyId(productId);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch(`/api/admin/products/${productId}/video`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage("Video uploaded.");
      if (input) input.value = "";
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(productId: string) {
    setBusyId(productId);
    setMessage(null);
    try {
      await fetch(`/api/admin/products/${productId}/video`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Product Videos</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      <p className="mb-4 text-xs text-text-muted">
        &quot;Check CJ&quot; looks for free, copyright-cleared videos CJ has for a product and re-hosts them here. If CJ
        has none (or you&apos;d rather use your own), upload a video directly — an uploaded video always takes priority
        over a CJ one.
      </p>

      {message && <p className="mb-4 text-sm text-text-secondary">{message}</p>}

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {products.map((p) => {
            const status = statusMap[p.id];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-grey">
                  {p.mainImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.mainImageUrl} alt={p.nameEn} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{p.nameEn}</p>
                  <p className="text-xs text-text-muted">
                    {status?.hasVideo ? (
                      <span className={status.source === "admin" ? "text-accent-ink" : "text-price-note"}>
                        {status.source === "admin" ? "Uploaded video" : "Synced from CJ"}
                      </span>
                    ) : (
                      "No video"
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => checkCj(p.id)}
                  className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                >
                  Check CJ
                </button>
                <input
                  type="file"
                  accept="video/*"
                  ref={(el) => {
                    fileInputRefs.current[p.id] = el;
                  }}
                  onChange={() => handleUpload(p.id)}
                  disabled={busyId === p.id}
                  className="w-40 shrink-0 text-xs"
                />
                {status?.source === "admin" && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleRemove(p.id)}
                    className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-discount hover:border-discount disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
