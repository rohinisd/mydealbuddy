import { NextResponse } from "next/server";
import { simulatePay } from "@/lib/cj-orders";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await simulatePay(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Simulate pay failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
