import { NextResponse } from "next/server";
import { refundOrder, RefundError } from "@/lib/order-refunds";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await refundOrder(id);
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    if (err instanceof RefundError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to refund order:", err);
    return NextResponse.json({ error: "Something went wrong issuing the refund." }, { status: 500 });
  }
}
