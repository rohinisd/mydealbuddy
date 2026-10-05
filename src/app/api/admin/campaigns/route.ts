import { NextRequest, NextResponse } from "next/server";
import { listCampaignsForAdmin, createCampaign } from "@/lib/campaigns";

export async function GET() {
  const campaigns = await listCampaignsForAdmin();
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
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
  if (coinBonusType !== "none" && coinBonusValue <= 0) {
    return NextResponse.json({ error: "Coin bonus value must be greater than 0 for a multiplier or flat bonus." }, { status: 400 });
  }

  const campaign = await createCampaign({ title, bannerText, coinBonusType, coinBonusValue, startsAt, endsAt });
  return NextResponse.json(campaign);
}
