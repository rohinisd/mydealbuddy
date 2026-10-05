import { NextRequest, NextResponse } from "next/server";
import { updateCampaign, setCampaignActive, deleteCampaign } from "@/lib/campaigns";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.isActive === "boolean" && Object.keys(body).length === 1) {
    await setCampaignActive(id, body.isActive);
    return NextResponse.json({ ok: true });
  }

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const bannerText = typeof body?.bannerText === "string" ? body.bannerText.trim() : "";
  const coinBonusType = ["none", "multiplier", "flat"].includes(body?.coinBonusType) ? body.coinBonusType : "none";
  const coinBonusValue = Number(body?.coinBonusValue) || 0;
  const startsAt = typeof body?.startsAt === "string" ? body.startsAt : "";
  const endsAt = typeof body?.endsAt === "string" ? body.endsAt : "";

  if (!title || !bannerText || !startsAt || !endsAt) {
    return NextResponse.json({ error: "title, bannerText, startsAt, and endsAt are required" }, { status: 400 });
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json({ error: "End date must be after the start date." }, { status: 400 });
  }

  await updateCampaign(id, { title, bannerText, coinBonusType, coinBonusValue, startsAt, endsAt });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
