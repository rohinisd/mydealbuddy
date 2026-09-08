import { NextRequest, NextResponse } from "next/server";
import { setCouponActive, setCouponPublic } from "@/lib/coupons";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;
  const isPublic = typeof body?.isPublic === "boolean" ? body.isPublic : null;

  if (isActive === null && isPublic === null) {
    return NextResponse.json({ error: "isActive or isPublic (boolean) is required" }, { status: 400 });
  }

  if (isActive !== null) await setCouponActive(id, isActive);
  if (isPublic !== null) await setCouponPublic(id, isPublic);
  return NextResponse.json({ ok: true });
}
