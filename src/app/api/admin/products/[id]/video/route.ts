import { NextResponse } from "next/server";
import { uploadAdminVideo, removeAdminVideo } from "@/lib/product-videos";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("video");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No video file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "File must be a video" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Video must be under 50MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadAdminVideo(id, buffer, file.type);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeAdminVideo(id);
  return NextResponse.json({ ok: true });
}
