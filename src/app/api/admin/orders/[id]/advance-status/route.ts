import { NextRequest, NextResponse } from "next/server";
import { advanceSandboxStatus } from "@/lib/cj-orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const targetStatus = Number(body?.targetStatus);

  if (![400, 500, 600, 700].includes(targetStatus)) {
    return NextResponse.json({ error: "targetStatus must be one of 400, 500, 600, 700" }, { status: 400 });
  }

  try {
    await advanceSandboxStatus(id, targetStatus as 400 | 500 | 600 | 700);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Advance status failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
