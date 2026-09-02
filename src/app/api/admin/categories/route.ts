import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/app-categories";

export async function GET() {
  const tree = await getCategoryTree();
  return NextResponse.json(tree);
}
