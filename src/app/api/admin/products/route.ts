import { NextRequest, NextResponse } from "next/server";
import { listAllProductsForAdmin } from "@/lib/admin-products";
import { extractPid, syncProductByPid } from "@/lib/cj-sync";

export async function GET() {
  const products = await listAllProductsForAdmin();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  if (!input || !category) {
    return NextResponse.json({ error: "input (CJ product link or pid) and category are required" }, { status: 400 });
  }

  try {
    const pid = extractPid(input);
    const summary = await syncProductByPid(pid, category);
    return NextResponse.json({ ok: true, product: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
