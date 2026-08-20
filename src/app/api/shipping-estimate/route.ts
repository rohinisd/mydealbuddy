import { NextRequest, NextResponse } from "next/server";
import { getShippingEstimate } from "@/lib/cj-shipping";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  const zip = request.nextUrl.searchParams.get("zip");
  const quantity = Number(request.nextUrl.searchParams.get("quantity") || "1");

  if (!productId || !zip) {
    return NextResponse.json({ error: "productId and zip are required" }, { status: 400 });
  }

  try {
    const options = await getShippingEstimate(productId, zip, quantity);
    return NextResponse.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipping estimate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
