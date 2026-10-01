import { NextRequest, NextResponse } from "next/server";
import { listTrackedSubscriptions, createTrackedSubscription } from "@/lib/tracked-subscriptions";

export async function GET() {
  const rows = await listTrackedSubscriptions();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const serviceName = typeof body?.serviceName === "string" ? body.serviceName.trim() : "";
  const kind = body?.kind === "api_key" || body?.kind === "subscription" ? body.kind : null;

  if (!serviceName || !kind) {
    return NextResponse.json({ error: "serviceName and kind ('api_key' | 'subscription') are required" }, { status: 400 });
  }

  const row = await createTrackedSubscription({
    serviceName,
    accountLabel: typeof body?.accountLabel === "string" ? body.accountLabel : null,
    kind,
    renewsOn: typeof body?.renewsOn === "string" ? body.renewsOn : null,
    warnDays: typeof body?.warnDays === "number" ? body.warnDays : undefined,
    notes: typeof body?.notes === "string" ? body.notes : null,
  });
  return NextResponse.json(row);
}
