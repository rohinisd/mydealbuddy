import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { deleteReviewVideo, ReviewVideoError } from "@/lib/customer-reviews";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { videoId } = await params;
  try {
    await deleteReviewVideo(videoId, customer.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ReviewVideoError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
