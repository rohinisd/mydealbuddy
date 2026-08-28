import "server-only";
import { getShippingEstimate } from "@/lib/cj-shipping";

export interface CartShippingResult {
  shippable: boolean;
  total: number;
  unshippableProductIds: string[];
  // The order arrives once every line has -- bounded by the slowest line,
  // not summed. Null if CJ didn't return day estimates for any line.
  estimatedDays: { min: number; max: number } | null;
}

// CJ's freightCalculate is per-product (no multi-item cart endpoint), and its
// QPS=1 limit means a multi-line cart has to be quoted sequentially -- picks
// the cheapest carrier per line and sums them into one order-level shipping
// cost, since checkout doesn't offer a per-item carrier picker.
export async function getCartShippingEstimate(
  lines: { productId: string; quantity: number }[],
  countryCode: string,
  zip: string
): Promise<CartShippingResult> {
  let total = 0;
  const unshippableProductIds: string[] = [];
  let minDays: number | null = null;
  let maxDays: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const options = await getShippingEstimate(line.productId, zip, countryCode, line.quantity);
      if (options.length === 0) {
        unshippableProductIds.push(line.productId);
      } else {
        const cheapest = options[0];
        total += cheapest.cost;
        if (cheapest.minDays != null) minDays = minDays == null ? cheapest.minDays : Math.max(minDays, cheapest.minDays);
        if (cheapest.maxDays != null) maxDays = maxDays == null ? cheapest.maxDays : Math.max(maxDays, cheapest.maxDays);
      }
    } catch {
      unshippableProductIds.push(line.productId);
    }
    if (i < lines.length - 1) await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return {
    shippable: unshippableProductIds.length === 0,
    total: Math.round(total * 100) / 100,
    unshippableProductIds,
    estimatedDays: minDays != null && maxDays != null ? { min: minDays, max: maxDays } : null,
  };
}
