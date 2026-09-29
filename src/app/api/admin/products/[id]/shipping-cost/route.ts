import { NextRequest, NextResponse } from "next/server";
import { getShippingEstimate } from "@/lib/cj-shipping";
import { setProductCachedShippingCost } from "@/lib/admin-products";

// Reference address for the admin pricing tool only -- NJ, matching where
// the business has tax nexus (see src/lib/tax.ts). Real customer orders
// always quote to the actual shipping address; this is purely a stand-in
// so admins have a representative shipping cost while setting a price.
const REFERENCE_ZIP = "07302";
const REFERENCE_COUNTRY = "US";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const options = await getShippingEstimate(id, REFERENCE_ZIP, REFERENCE_COUNTRY, 1);
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
