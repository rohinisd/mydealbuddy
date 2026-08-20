import { NextRequest, NextResponse } from "next/server";
import { getShippingEstimate } from "@/lib/cj-shipping";
import { isValidPostalCode } from "@/lib/postal-codes";
import { verifyPostalCodeExists } from "@/lib/postal-lookup";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  const zip = request.nextUrl.searchParams.get("zip");
  const country = request.nextUrl.searchParams.get("country");
  const quantity = Number(request.nextUrl.searchParams.get("quantity") || "1");

  if (!productId || !zip || !country) {
    return NextResponse.json({ error: "productId, zip, and country are required" }, { status: 400 });
  }

  // CJ's freightCalculate doesn't validate postal codes at all (verified:
  // garbage input still returns priced results), so we reject bad input
  // ourselves before it ever reaches CJ -- and before burning a QPS-limited call.
  if (!isValidPostalCode(country, zip)) {
    return NextResponse.json({ error: "That doesn't look like a valid postal/ZIP code for the selected country." }, { status: 400 });
  }

  // Format-valid but not necessarily real (e.g. "780001" looks like an Indian
  // PIN but isn't one) -- check real existence where we have reliable coverage.
  const exists = await verifyPostalCodeExists(country, zip);
  if (exists === false) {
    return NextResponse.json({ error: "That postal/ZIP code doesn't appear to exist. Double-check it and try again." }, { status: 400 });
  }

  try {
    const options = await getShippingEstimate(productId, zip, country, quantity);
    return NextResponse.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipping estimate failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
