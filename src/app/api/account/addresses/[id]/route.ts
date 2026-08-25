import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { deleteAddress, setDefaultAddress } from "@/lib/customer-addresses";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (body?.setDefault === true) {
    await setDefaultAddress(customer.id, id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await deleteAddress(customer.id, id);
  return NextResponse.json({ ok: true });
}
