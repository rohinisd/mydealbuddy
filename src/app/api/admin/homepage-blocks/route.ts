import { NextRequest, NextResponse } from "next/server";
import { createHomepageBlock, listHomepageBlocksForAdmin, type HomepageBlockType } from "@/lib/homepage-content";

const VALID_TYPES: HomepageBlockType[] = ["hero_slide", "promo_banner", "deal_card"];

export async function GET() {
  const blocks = await listHomepageBlocksForAdmin();
  return NextResponse.json(blocks);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const blockType = VALID_TYPES.includes(body?.blockType) ? (body.blockType as HomepageBlockType) : null;
  const headline = typeof body?.headline === "string" ? body.headline.trim() : "";
  const href = typeof body?.href === "string" ? body.href.trim() : "";

  if (!blockType || !headline || !href) {
    return NextResponse.json({ error: "blockType, headline, and href are required" }, { status: 400 });
  }

  const block = await createHomepageBlock({
    blockType,
    headline,
    href,
    bg: typeof body?.bg === "string" && body.bg ? body.bg : undefined,
    pill: typeof body?.pill === "string" && body.pill ? body.pill : null,
    subcopy: typeof body?.subcopy === "string" && body.subcopy ? body.subcopy : null,
    cta: typeof body?.cta === "string" && body.cta ? body.cta : null,
  });
  return NextResponse.json({ ok: true, block });
}
