import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { deleteReviewPhoto, ReviewPhotoError } from "@/lib/customer-reviews";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { photoId } = await params;
  try {
    await deleteReviewPhoto(photoId, customer.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ReviewPhotoError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
