import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { syncCustomerCart } from "@/lib/cart-sync";

export async function PUT(request: NextRequest) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  const validLines = lines
    .filter((l: unknown): l is { productId: unknown; quantity: unknown; option?: unknown } => typeof l === "object" && l !== null)
    .map((l: { productId: unknown; quantity: unknown; option?: unknown }) => ({
      productId: String(l.productId),
      quantity: Number(l.quantity),
      option: typeof l.option === "string" ? l.option : undefined,
    }));

  await syncCustomerCart(customer.id, validLines);
  return NextResponse.json({ ok: true });
}
