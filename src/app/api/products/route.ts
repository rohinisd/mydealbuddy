import { NextRequest, NextResponse } from "next/server";
import { getProductBySku, getProductsByIds, searchProducts } from "@/lib/products";

// Lets client components (cart, checkout, wishlist, quick-order, search)
// resolve real DB-backed products -- they can't import @/lib/db directly
// since "server-only" (see src/lib/db.ts) blocks pg from ever reaching a
// client bundle.
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const skuParam = request.nextUrl.searchParams.get("sku");
  const qParam = request.nextUrl.searchParams.get("q");

  if (skuParam) {
    const product = await getProductBySku(skuParam);
    return NextResponse.json(product ? [product] : []);
  }

  if (qParam !== null) {
    const term = qParam.trim();
    if (!term) return NextResponse.json([]);
    const limitParam = Number(request.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;
    const products = await searchProducts(term, limit);
    return NextResponse.json(products);
  }

  if (!idsParam) {
    return NextResponse.json({ error: "ids, sku, or q query param is required" }, { status: 400 });
  }
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  const products = await getProductsByIds(ids);
  return NextResponse.json(products);
}
