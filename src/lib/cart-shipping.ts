import "server-only";
import { getShippingEstimate } from "@/lib/cj-shipping";

export interface CartShippingResult {
  shippable: boolean;
  total: number;
  unshippableProductIds: string[];
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const options = await getShippingEstimate(line.productId, zip, countryCode, line.quantity);
      if (options.length === 0) {
        unshippableProductIds.push(line.productId);
      } else {
        total += options[0].cost;
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
  };
}
