import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { addReviewPhoto, ReviewPhotoError } from "@/lib/customer-reviews";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { reviewId } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("photo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No photo file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photo = await addReviewPhoto(reviewId, customer.id, buffer, file.type);
    return NextResponse.json({ ok: true, ...photo });
  } catch (err) {
    if (err instanceof ReviewPhotoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to add review photo:", err);
    return NextResponse.json({ error: "Something went wrong uploading your photo." }, { status: 500 });
  }
}
