import { NextRequest, NextResponse } from "next/server";
import { setProductActive } from "@/lib/cj-sync";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;

  if (isActive === null) {
    return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 });
  }

  await setProductActive(id, isActive);
  return NextResponse.json({ ok: true });
}
