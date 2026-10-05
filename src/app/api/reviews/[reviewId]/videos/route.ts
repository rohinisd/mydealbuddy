import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { addReviewVideo, ReviewVideoError } from "@/lib/customer-reviews";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB, matches the admin product-video upload limit

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { reviewId } = await params;
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const video = await addReviewVideo(reviewId, customer.id, buffer, file.type);
    return NextResponse.json({ ok: true, ...video });
  } catch (err) {
    if (err instanceof ReviewVideoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to add review video:", err);
    return NextResponse.json({ error: "Something went wrong uploading your video." }, { status: 500 });
  }
}
