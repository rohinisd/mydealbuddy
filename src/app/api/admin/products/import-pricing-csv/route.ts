import { NextRequest, NextResponse } from "next/server";
import { listAllProductsForAdmin, bulkSetOverridePrices } from "@/lib/admin-products";
import { parsePricingCsv } from "@/lib/pricing-csv";

const COST_TOLERANCE = 0.01;

export interface ImportPricingCsvResult {
  applied: { id: string; name: string; price: number }[];
  warnings: { id: string; name: string; message: string }[];
  errors: { rowNum: number; id: string | null; message: string }[];
  skippedBlankCount: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const text = await request.text();
  if (!text.trim()) {
    return NextResponse.json({ error: "Upload a non-empty CSV file." }, { status: 400 });
  }

  const parsed = parsePricingCsv(text);
  if (parsed.priced.length === 0 && parsed.errors.length > 0 && parsed.skippedBlank.length === 0) {
    // Header/structure-level failure -- nothing in the file was even readable as a row.
    return NextResponse.json(
      { error: parsed.errors[0].error || "Could not read this CSV." },
      { status: 400 }
    );
  }

  const current = await listAllProductsForAdmin();
  const byId = new Map(current.map((p) => [p.id, p]));

  const result: ImportPricingCsvResult = {
    applied: [],
    warnings: [],
    errors: parsed.errors.map((e) => ({ rowNum: e.rowNum, id: e.id, message: e.error || "Invalid row" })),
    skippedBlankCount: parsed.skippedBlank.length,
  };

  const toApply: { id: string; price: number }[] = [];
  for (const row of parsed.priced) {
    const product = byId.get(row.id);
    if (!product) {
      result.errors.push({ rowNum: -1, id: row.id, message: `No product with id ${row.id} exists -- it may have been deleted since export.` });
      continue;
    }

    const costChanged = row.csvCjCost != null && product.costPrice != null && Math.abs(row.csvCjCost - product.costPrice) > COST_TOLERANCE;
    const shippingChanged =
      row.csvShippingCost != null && product.cachedShippingCost != null && Math.abs(row.csvShippingCost - product.cachedShippingCost) > COST_TOLERANCE;
    if (costChanged || shippingChanged) {
      result.warnings.push({
        id: row.id,
        name: product.nameEn,
        message: "Cost or shipping changed since this CSV was exported -- double-check the margin on this price before trusting it.",
      });
    }

    toApply.push({ id: row.id, price: row.price });
    result.applied.push({ id: row.id, name: product.nameEn, price: row.price });
  }

  if (toApply.length > 0) {
    await bulkSetOverridePrices(toApply);
  }

  return NextResponse.json(result);
}
