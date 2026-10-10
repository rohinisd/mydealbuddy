import { NextRequest, NextResponse } from "next/server";
import { getShippingEstimate, ADMIN_REFERENCE_ZIP, ADMIN_REFERENCE_COUNTRY } from "@/lib/cj-shipping";
import { setProductCachedShippingCost } from "@/lib/admin-products";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const options = await getShippingEstimate(id, ADMIN_REFERENCE_ZIP, ADMIN_REFERENCE_COUNTRY, 1);
    if (options.length === 0) {
      return NextResponse.json({ error: "CJ returned no shipping options for the reference address" }, { status: 502 });
    }
    const cheapest = options[0].cost;
    await setProductCachedShippingCost(id, cheapest);
    return NextResponse.json({ shippingCost: cheapest });
  } catch (err) {
    console.error("Failed to fetch CJ shipping estimate:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch shipping estimate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
