import { NextResponse } from "next/server";
import { getOrderShipping, retryFailedCjFulfillment } from "@/lib/cj-fulfillment";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipping = await getOrderShipping(id);
  if (!shipping) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    await retryFailedCjFulfillment(id, shipping);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to retry CJ fulfillment for order ${id}:`, err);
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }
}
