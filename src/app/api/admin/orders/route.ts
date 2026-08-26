import { NextRequest, NextResponse } from "next/server";
import { createCjOrder } from "@/lib/cj-orders";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.productDbId || !body?.quantity || !body?.logisticName || !body?.shipping) {
    return NextResponse.json({ error: "productDbId, quantity, logisticName, and shipping are required" }, { status: 400 });
  }

  try {
    const result = await createCjOrder({
      productDbId: body.productDbId,
      quantity: Number(body.quantity),
      logisticName: body.logisticName,
      shipping: body.shipping,
    });
    return NextResponse.json({ ok: true, order: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order creation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
