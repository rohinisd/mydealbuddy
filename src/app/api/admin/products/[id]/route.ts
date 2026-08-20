import { NextRequest, NextResponse } from "next/server";
import { setProductActive, setProductBadges } from "@/lib/cj-sync";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.isActive === "boolean") {
    await setProductActive(id, body.isActive);
  }
  if (Array.isArray(body?.badges)) {
    await setProductBadges(id, body.badges);
  }
  if (typeof body?.isActive !== "boolean" && !Array.isArray(body?.badges)) {
    return NextResponse.json({ error: "isActive (boolean) or badges (string[]) is required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
