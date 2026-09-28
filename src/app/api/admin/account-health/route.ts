import { NextResponse } from "next/server";
import { checkAccountHealth } from "@/lib/account-health";

export async function GET() {
  const results = await checkAccountHealth();
  return NextResponse.json(results);
}
