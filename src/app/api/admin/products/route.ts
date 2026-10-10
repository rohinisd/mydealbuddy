import { NextRequest, NextResponse, after } from "next/server";
import { listAllProductsForAdmin, setProductCachedShippingCost } from "@/lib/admin-products";
import { extractPid, syncProductByPid } from "@/lib/cj-sync";
import { getCategoryById } from "@/lib/app-categories";
import { getShippingEstimate, ADMIN_REFERENCE_ZIP, ADMIN_REFERENCE_COUNTRY } from "@/lib/cj-shipping";

export async function GET() {
  const products = await listAllProductsForAdmin();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";

  if (!input || !categoryId) {
    return NextResponse.json({ error: "input (CJ product link or pid) and categoryId are required" }, { status: 400 });
  }

  const category = await getCategoryById(categoryId);
  if (!category || category.level !== 3) {
    return NextResponse.json({ error: "categoryId must be a leaf category" }, { status: 400 });
  }

  try {
    const pid = extractPid(input);
    const summary = await syncProductByPid(pid, categoryId);

    // Admin shouldn't have to click "Fetch" before a newly-added product even
    // shows a shipping cost -- run it after the response goes out so adding
    // one product doesn't also eat the ~2-3s a CJ freight lookup takes
    // (QPS=1, two sequential calls). Best-effort: a CJ hiccup here just means
    // the product falls back to the existing manual "Fetch" button, exactly
    // like it would have before this ran automatically.
    after(async () => {
      try {
        const options = await getShippingEstimate(summary.productDbId, ADMIN_REFERENCE_ZIP, ADMIN_REFERENCE_COUNTRY, 1);
        if (options.length > 0) {
          await setProductCachedShippingCost(summary.productDbId, options[0].cost);
        }
      } catch (err) {
        console.error(`Auto shipping-cost fetch failed for product ${summary.productDbId}:`, err);
      }
    });

    return NextResponse.json({ ok: true, product: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
