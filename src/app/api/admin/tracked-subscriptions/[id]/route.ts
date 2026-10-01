import { NextRequest, NextResponse } from "next/server";
import { updateTrackedSubscription, deleteTrackedSubscription } from "@/lib/tracked-subscriptions";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  try {
    await updateTrackedSubscription(id, {
      serviceName: typeof body?.serviceName === "string" ? body.serviceName : undefined,
      accountLabel: body?.accountLabel === null || typeof body?.accountLabel === "string" ? body.accountLabel : undefined,
      kind: body?.kind === "api_key" || body?.kind === "subscription" ? body.kind : undefined,
      renewsOn: body?.renewsOn === null || typeof body?.renewsOn === "string" ? body.renewsOn : undefined,
      warnDays: typeof body?.warnDays === "number" ? body.warnDays : undefined,
      notes: body?.notes === null || typeof body?.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTrackedSubscription(id);
  return NextResponse.json({ ok: true });
}
