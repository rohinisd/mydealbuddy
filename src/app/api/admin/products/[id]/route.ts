import { NextRequest, NextResponse } from "next/server";
import { setProductActive, setProductBadges } from "@/lib/cj-sync";
import { getProductDetailForAdmin, setProductOverridePrice, setProductCategory } from "@/lib/admin-products";
import { getCategoryById } from "@/lib/app-categories";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProductDetailForAdmin(id);
  if (!detail) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const hasIsActive = typeof body?.isActive === "boolean";
  const hasBadges = Array.isArray(body?.badges);
  const hasOverridePrice = body?.overridePrice === null || typeof body?.overridePrice === "number";
  const hasCategoryId = typeof body?.categoryId === "string" && body.categoryId.trim() !== "";

  if (!hasIsActive && !hasBadges && !hasOverridePrice && !hasCategoryId) {
    return NextResponse.json(
      { error: "isActive (boolean), badges (string[]), overridePrice (number|null), or categoryId (string) is required" },
      { status: 400 }
    );
  }

  if (hasIsActive) await setProductActive(id, body.isActive);
  if (hasBadges) await setProductBadges(id, body.badges);
  if (hasOverridePrice) {
    if (typeof body.overridePrice === "number" && body.overridePrice <= 0) {
      return NextResponse.json({ error: "overridePrice must be greater than 0" }, { status: 400 });
    }
    await setProductOverridePrice(id, body.overridePrice);
  }
  if (hasCategoryId) {
    const category = await getCategoryById(body.categoryId);
    if (!category || category.level !== 3) {
      return NextResponse.json({ error: "categoryId must be a leaf category" }, { status: 400 });
    }
    await setProductCategory(id, body.categoryId);
  }

  return NextResponse.json({ ok: true });
}
