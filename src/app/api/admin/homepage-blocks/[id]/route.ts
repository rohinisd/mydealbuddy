import { NextRequest, NextResponse } from "next/server";
import { deleteHomepageBlock, moveHomepageBlock, setHomepageBlockActive, updateHomepageBlock } from "@/lib/homepage-content";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.isActive === "boolean") {
    await setHomepageBlockActive(id, body.isActive);
    return NextResponse.json({ ok: true });
  }

  if (body?.move === "up" || body?.move === "down") {
    await moveHomepageBlock(id, body.move);
    return NextResponse.json({ ok: true });
  }

  const headline = typeof body?.headline === "string" ? body.headline.trim() : "";
  const href = typeof body?.href === "string" ? body.href.trim() : "";
  if (!headline || !href) {
    return NextResponse.json({ error: "headline and href are required" }, { status: 400 });
  }

  await updateHomepageBlock(id, {
    pill: typeof body?.pill === "string" && body.pill ? body.pill : null,
    headline,
    subcopy: typeof body?.subcopy === "string" && body.subcopy ? body.subcopy : null,
    cta: typeof body?.cta === "string" && body.cta ? body.cta : null,
    href,
    bg: typeof body?.bg === "string" && body.bg ? body.bg : "#eaf1f8",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteHomepageBlock(id);
  return NextResponse.json({ ok: true });
}
