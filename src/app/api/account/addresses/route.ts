import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { createAddress, listAddresses } from "@/lib/customer-addresses";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const addresses = await listAddresses(customer.id);
  return NextResponse.json(addresses);
}

export async function POST(request: NextRequest) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const countryCode = typeof body?.countryCode === "string" ? body.countryCode : "";
  const country = typeof body?.country === "string" ? body.country : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const addressLine = typeof body?.addressLine === "string" ? body.addressLine.trim() : "";

  if (!fullName || !countryCode || !country || !city || !addressLine) {
    return NextResponse.json({ error: "Name, country, city, and address are required." }, { status: 400 });
  }

  const address = await createAddress(customer.id, {
    label: typeof body?.label === "string" ? body.label : null,
    fullName,
    phone: typeof body?.phone === "string" ? body.phone : null,
    countryCode,
    country,
    province: typeof body?.province === "string" ? body.province : null,
    city,
    addressLine,
    zip: typeof body?.zip === "string" ? body.zip : null,
    isDefault: body?.isDefault === true,
  });
  return NextResponse.json({ ok: true, address });
}
