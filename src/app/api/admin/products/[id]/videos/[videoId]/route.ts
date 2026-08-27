import { NextResponse } from "next/server";
import { deleteVideoById } from "@/lib/product-videos";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  const { id, videoId } = await params;
  await deleteVideoById(id, videoId);
  return NextResponse.json({ ok: true });
}
