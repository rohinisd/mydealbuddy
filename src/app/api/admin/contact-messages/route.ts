import { NextResponse } from "next/server";
import { listContactMessages } from "@/lib/contact-messages";

export async function GET() {
  const messages = await listContactMessages();
  return NextResponse.json(messages);
}
