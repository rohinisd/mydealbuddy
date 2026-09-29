import { NextResponse } from "next/server";
import { getShippingEstimate } from "@/lib/cj-shipping";

// A representative US destination for cost-basis purposes (NJ, the client's
// own tax nexus) -- not a real customer quote, just a realistic reference
// point for "what does shipping typically cost" when setting a margin. CJ's
// own warehouse-aware logic (US stock vs China) applies automatically.
const REFERENCE_ZIP = "07102";
const REFERENCE_COUNTRY = "US";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const options = await getShippingEstimate(id, REFERENCE_ZIP, REFERENCE_COUNTRY, 1);
    if (options.length === 0) {
      return NextResponse.json({ error: "CJ returned no shipping options for this product." }, { status: 502 });
    }
    return NextResponse.json({ cost: options[0].cost, method: options[0].method });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipping cost lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
