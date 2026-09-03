import { NextRequest, NextResponse } from "next/server";
import { getCartShippingEstimate } from "@/lib/cart-shipping";
import { isValidPostalCode } from "@/lib/postal-codes";
import { verifyPostalCodeExists } from "@/lib/postal-lookup";
import { getProductsByIds } from "@/lib/products";
import { calculateTax } from "@/lib/tax";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  const countryCode = typeof body?.countryCode === "string" ? body.countryCode : "";
  const zip = typeof body?.zip === "string" ? body.zip.trim() : "";
  const province = typeof body?.province === "string" ? body.province : undefined;

  const validLines = lines
    .filter((l: unknown): l is { productId: unknown; quantity: unknown } => typeof l === "object" && l !== null)
    .map((l: { productId: unknown; quantity: unknown }) => ({ productId: String(l.productId), quantity: Number(l.quantity) }))
    .filter((l: { productId: string; quantity: number }) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);

  if (validLines.length === 0 || !countryCode || !zip) {
    return NextResponse.json({ error: "lines, countryCode, and zip are required" }, { status: 400 });
  }

  if (!isValidPostalCode(countryCode, zip)) {
    return NextResponse.json({ error: "That doesn't look like a valid postal/ZIP code for the selected country." }, { status: 400 });
  }
  const exists = await verifyPostalCodeExists(countryCode, zip);
  if (exists === false) {
    return NextResponse.json({ error: "That postal/ZIP code doesn't appear to exist. Double-check it and try again." }, { status: 400 });
  }

  try {
    const [result, products] = await Promise.all([
      getCartShippingEstimate(validLines, countryCode, zip),
      getProductsByIds(validLines.map((l: { productId: string; quantity: number }) => l.productId)),
    ]);
    // Display-only estimate -- ignores any coupon (not known at this point
    // in checkout), so it can slightly overstate tax when a coupon is later
    // applied. The actual charged amount is always recomputed authoritatively
    // server-side in resolveOrder() at payment time, coupon included.
    const productById = new Map(products.map((p) => [p.id, p]));
    const subtotal = validLines.reduce(
      (sum: number, l: { productId: string; quantity: number }) => sum + (productById.get(l.productId)?.price ?? 0) * l.quantity,
      0
    );
    const taxAmount = calculateTax(subtotal, countryCode, province);
    return NextResponse.json({ ...result, taxAmount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipping estimate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
