import { NextResponse } from "next/server";
import { confirmOrder } from "@/lib/cj-orders";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await confirmOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm order failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
