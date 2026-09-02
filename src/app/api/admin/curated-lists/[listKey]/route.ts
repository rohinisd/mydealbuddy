import { NextRequest, NextResponse } from "next/server";
import {
  isCuratedListKey,
  listCuratedItemsForAdmin,
  addToCuratedList,
  reorderCuratedList,
} from "@/lib/curated-lists";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ listKey: string }> }) {
  const { listKey } = await params;
  if (!isCuratedListKey(listKey)) return NextResponse.json({ error: "Unknown list" }, { status: 404 });
  const items = await listCuratedItemsForAdmin(listKey);
  return NextResponse.json(items);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ listKey: string }> }) {
  const { listKey } = await params;
  if (!isCuratedListKey(listKey)) return NextResponse.json({ error: "Unknown list" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });
  await addToCuratedList(listKey, productId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ listKey: string }> }) {
  const { listKey } = await params;
  if (!isCuratedListKey(listKey)) return NextResponse.json({ error: "Unknown list" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const productIds = Array.isArray(body?.productIds) ? body.productIds.map(String) : null;
  if (!productIds) return NextResponse.json({ error: "productIds (string[]) is required" }, { status: 400 });
  await reorderCuratedList(listKey, productIds);
  return NextResponse.json({ ok: true });
}
