import type { ResolveOrderInput } from "@/lib/orders";

export type ParsedCheckoutBody =
  | { ok: true; lines: ResolveOrderInput["lines"]; shipping: ResolveOrderInput["shipping"]; couponCode: string | null }
  | { ok: false; error: string };

const REQUIRED_SHIPPING_FIELDS = ["name", "email", "countryCode", "country", "city", "address"] as const;

/** Shared body-shape parsing/validation for both the no-payment and PayPal checkout routes. */
export function parseCheckoutBody(body: unknown): ParsedCheckoutBody {
  const b = body as Record<string, unknown> | null;
  const lines = Array.isArray(b?.lines) ? b.lines : [];
  const shipping = (b?.shipping ?? {}) as Record<string, unknown>;

  const validLines = lines
    .filter((l: unknown): l is { productId: unknown; quantity: unknown; option?: unknown } => typeof l === "object" && l !== null)
    .map((l: { productId: unknown; quantity: unknown; option?: unknown }) => ({
      productId: String(l.productId),
      quantity: Number(l.quantity),
      option: typeof l.option === "string" ? l.option : undefined,
    }))
    .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);

  for (const field of REQUIRED_SHIPPING_FIELDS) {
    if (typeof shipping[field] !== "string" || !(shipping[field] as string).trim()) {
      return { ok: false, error: `Shipping ${field} is required.` };
    }
  }

  return {
    ok: true,
    lines: validLines,
    couponCode: typeof b?.couponCode === "string" ? b.couponCode : null,
    shipping: {
      name: shipping.name as string,
      email: shipping.email as string,
      countryCode: shipping.countryCode as string,
      country: shipping.country as string,
      province: typeof shipping.province === "string" ? shipping.province : undefined,
      city: shipping.city as string,
      address: shipping.address as string,
      zip: typeof shipping.zip === "string" ? shipping.zip : undefined,
      phone: typeof shipping.phone === "string" ? shipping.phone : undefined,
    },
  };
}
