import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { syncCjVideosForProduct } from "@/lib/product-videos";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pidRes = await pool.query(`SELECT pid FROM cj_product WHERE id = $1`, [id]);
  const pid = pidRes.rows[0]?.pid as string | undefined;
  if (!pid) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  try {
    const result = await syncCjVideosForProduct(id, pid);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
