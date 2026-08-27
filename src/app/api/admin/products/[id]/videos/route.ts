import { NextResponse } from "next/server";
import { listVideosForProduct } from "@/lib/product-videos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videos = await listVideosForProduct(id);
  return NextResponse.json(videos);
}
