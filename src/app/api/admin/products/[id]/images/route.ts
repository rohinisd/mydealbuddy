import { NextResponse } from "next/server";
import { listImagesForProduct, addAdminImage } from "@/lib/product-images";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const images = await listImagesForProduct(id);
  return NextResponse.json(images);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await addAdminImage(id, buffer, file.type);
  return NextResponse.json({ ok: true });
}
