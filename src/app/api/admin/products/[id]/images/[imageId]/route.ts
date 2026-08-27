import { NextResponse } from "next/server";
import { deleteImage } from "@/lib/product-images";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  await deleteImage(id, imageId);
  return NextResponse.json({ ok: true });
}
