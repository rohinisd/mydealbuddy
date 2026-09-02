"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { OrderLine } from "@/lib/orders";

// Adds every line from a past order back into the current cart (merging with
// whatever's already there, same as adding any product normally) and sends
// the customer to review it. If a line's product has since been deactivated
// it just won't render in the cart -- same behavior any existing cart item
// already has, nothing special needed here.
export function ReorderButton({ lines }: { lines: OrderLine[] }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function handleReorder() {
    setBusy(true);
    for (const line of lines) {
      addItem(line.productId, line.optionLabel ?? undefined, line.quantity);
    }
    router.push("/cart");
  }

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={busy}
      className="btn-tracking rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
    >
      {busy ? "Adding..." : "Reorder"}
    </button>
  );
}
