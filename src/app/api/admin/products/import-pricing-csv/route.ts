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
  if (parsed.rows.length === 0 && parsed.errors.length > 0 && parsed.skippedBlank.length === 0) {
    // Header/structure-level failure -- nothing in the file was even readable as a row.
    return NextResponse.json({ error: parsed.errors[0].error || "Could not read this CSV." }, { status: 400 });
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
  for (const row of parsed.rows) {
    const product = byId.get(row.id);
    if (!product) {
      result.errors.push({ rowNum: row.rowNum, id: row.id, message: `No product with id ${row.id} exists -- it may have been deleted since export.` });
      continue;
    }

    let price: number;
    if (row.mode === "fixed") {
      price = row.value;
      // A fixed final_price is a decision the admin typed -- trust it as-is,
      // but warn if the cost it was based on has since moved, so a margin
      // that looked fine at export time doesn't silently go underwater.
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
    } else {
      // A markup rule is resolved against CURRENT cost, not whatever was in
      // the CSV when it was exported -- that's the whole point of a markup
      // vs. a fixed price: it should track the latest cost automatically.
      const totalCost = product.costPrice != null && product.cachedShippingCost != null ? product.costPrice + product.cachedShippingCost : null;
      if (totalCost == null) {
        result.errors.push({
          rowNum: row.rowNum,
          id: row.id,
          message: `Can't apply a markup -- "${product.nameEn}" has no shipping cost cached yet. Fetch shipping for it first.`,
        });
        continue;
      }
      price = row.mode === "pct" ? totalCost * (1 + row.value / 100) : totalCost + row.value;
      if (!Number.isFinite(price) || price <= 0) {
        result.errors.push({
          rowNum: row.rowNum,
          id: row.id,
          message: `markup_${row.mode === "pct" ? "pct" : "dollar"} of ${row.value} on "${product.nameEn}" works out to $${price.toFixed(2)} -- must be greater than 0.`,
        });
        continue;
      }
    }

    toApply.push({ id: row.id, price });
    result.applied.push({ id: row.id, name: product.nameEn, price });
  }

  if (toApply.length > 0) {
    await bulkSetOverridePrices(toApply);
  }

  return NextResponse.json(result);
}
