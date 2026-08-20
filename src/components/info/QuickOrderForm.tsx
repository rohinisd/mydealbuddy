"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";

export function QuickOrderForm() {
  const { addItem } = useCart();
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products?sku=${encodeURIComponent(sku.trim())}`);
      const products: Product[] = await res.json();
      const product = products[0];
      if (!product) {
        setMessage(`No product found for SKU "${sku}".`);
        return;
      }
      addItem(product.id, product.options?.[0], quantity);
      setMessage(`Added "${product.name}" (×${quantity}) to your bag.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <input
          required
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="Enter product SKU"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="flex items-center rounded-md border border-border-strong">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2 text-text-secondary hover:text-accent">
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => q + 1)} className="px-3 py-2 text-text-secondary hover:text-accent">
            +
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-tracking rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Looking up…" : "Add to Bag"}
      </button>
      {message && <p className="rounded-md border border-dashed border-border bg-surface-grey p-3 text-sm text-text-secondary">{message}</p>}
    </form>
  );
}
