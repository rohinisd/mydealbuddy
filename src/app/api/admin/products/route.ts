import { NextRequest, NextResponse } from "next/server";
import { listAllProductsForAdmin } from "@/lib/admin-products";
import { extractPid, syncProductByPid } from "@/lib/cj-sync";
import { getCategoryById } from "@/lib/app-categories";

export async function GET() {
  const products = await listAllProductsForAdmin();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";

  if (!input || !categoryId) {
    return NextResponse.json({ error: "input (CJ product link or pid) and categoryId are required" }, { status: 400 });
  }

  const category = await getCategoryById(categoryId);
  if (!category || category.level !== 3) {
    return NextResponse.json({ error: "categoryId must be a leaf category" }, { status: 400 });
  }

  try {
    const pid = extractPid(input);
    const summary = await syncProductByPid(pid, categoryId);
    return NextResponse.json({ ok: true, product: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
