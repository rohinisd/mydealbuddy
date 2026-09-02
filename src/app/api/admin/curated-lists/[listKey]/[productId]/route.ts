import { NextRequest, NextResponse } from "next/server";
import { isCuratedListKey, removeFromCuratedList } from "@/lib/curated-lists";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listKey: string; productId: string }> }
) {
  const { listKey, productId } = await params;
  if (!isCuratedListKey(listKey)) return NextResponse.json({ error: "Unknown list" }, { status: 404 });
  await removeFromCuratedList(listKey, productId);
  return NextResponse.json({ ok: true });
}
