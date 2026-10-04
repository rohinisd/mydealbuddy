import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { syncCustomerWishlist } from "@/lib/wishlist-sync";

export async function PUT(request: NextRequest) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : [];

  await syncCustomerWishlist(customer.id, ids);
  return NextResponse.json({ ok: true });
}
