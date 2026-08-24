import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/current-customer";
import { submitReview, ReviewError } from "@/lib/customer-reviews";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "You must be logged in to leave a review." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  const text = typeof body?.body === "string" ? body.body : "";

  try {
    await submitReview(customer.id, id, rating, text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ReviewError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to submit review:", err);
    return NextResponse.json({ error: "Something went wrong submitting your review." }, { status: 500 });
  }
}
