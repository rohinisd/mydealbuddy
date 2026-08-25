import { NextResponse } from "next/server";
import { listVideoStatusForAdmin } from "@/lib/product-videos";

export async function GET() {
  const statusMap = await listVideoStatusForAdmin();
  return NextResponse.json(statusMap);
}
