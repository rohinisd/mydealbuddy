// Pure, framework-agnostic CSV helpers -- used both client-side (export button,
// no network round-trip needed since the admin page already has the product
// list loaded) and server-side (import route re-parses the re-uploaded file).

export const PRICING_CSV_HEADER = [
  "id",
  "name",
  "category",
  "subcategory",
  "specific_category",
  "pid",
  "cj_cost",
  "shipping_cost",
  "total_cost",
  "cj_suggested_price",
  "markup_pct",
  "markup_dollar",
  "final_price",
] as const;

export interface PricingCsvSourceRow {
  id: string;
  name: string;
  categoryL1: string | null;
  categoryL2: string | null;
  categoryL3: string | null;
  pid: string;
  cjCost: number | null;
  shippingCost: number | null;
  priceMin: number | null;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Admin fills in exactly one of markup_pct / markup_dollar / final_price per
 * row in Excel/Sheets, then re-uploads via importPricingCsv. markup_pct and
 * markup_dollar are resolved against the product's CURRENT cost at import
 * time (not the cost recorded here) -- that's the point of a markup rule,
 * vs. a fixed final_price which is trusted as typed.
 */
export function buildPricingCsv(rows: PricingCsvSourceRow[]): string {
  const lines = [PRICING_CSV_HEADER.join(",")];
  for (const r of rows) {
    const totalCost = r.cjCost != null && r.shippingCost != null ? r.cjCost + r.shippingCost : null;
    lines.push(
      [
        r.id,
        csvEscape(r.name),
        csvEscape(r.categoryL1 ?? ""),
        csvEscape(r.categoryL2 ?? ""),
        csvEscape(r.categoryL3 ?? ""),
        r.pid,
        r.cjCost != null ? r.cjCost.toFixed(2) : "",
        r.shippingCost != null ? r.shippingCost.toFixed(2) : "",
        totalCost != null ? totalCost.toFixed(2) : "",
        r.priceMin != null ? r.priceMin.toFixed(2) : "",
        "",
        "",
        "",
      ].join(",")
    );
  }
  return lines.join("\n");
}

/** Minimal RFC4180-style parser -- only needs to round-trip what buildPricingCsv wrote (quoted fields, doubled internal quotes). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export interface PricingCsvRowResult {
  rowNum: number; // 1-based, counting the header as row 1
  id: string | null;
  error?: string;
}

export type PricingMode = "fixed" | "pct" | "dollar";

export interface ParsedPricingRow {
  rowNum: number;
  id: string;
  mode: PricingMode;
  /** The typed final_price (mode "fixed"), or the markup amount (mode "pct"/"dollar" -- a percent or a dollar amount, not a price). */
  value: number;
  csvCjCost: number | null;
  csvShippingCost: number | null;
}

export interface ParsedPricingCsv {
  rows: ParsedPricingRow[];
  skippedBlank: PricingCsvRowResult[];
  errors: PricingCsvRowResult[];
}

function parseOptionalMoney(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/** Parses what buildPricingCsv produced after an admin edited one pricing column. */
export function parsePricingCsv(text: string): ParsedPricingCsv {
  const csvRows = parseCsvRows(text);
  const rows: ParsedPricingRow[] = [];
  const skippedBlank: PricingCsvRowResult[] = [];
  const errors: PricingCsvRowResult[] = [];

  if (csvRows.length === 0) {
    errors.push({ rowNum: 1, id: null, error: "File is empty." });
    return { rows, skippedBlank, errors };
  }

  const header = csvRows[0].map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf("id");
  const finalPriceIdx = header.indexOf("final_price");
  const cjCostIdx = header.indexOf("cj_cost");
  const shippingIdx = header.indexOf("shipping_cost");
  const markupPctIdx = header.indexOf("markup_pct");
  const markupDollarIdx = header.indexOf("markup_dollar");
  if (idIdx === -1 || finalPriceIdx === -1) {
    errors.push({
      rowNum: 1,
      id: null,
      error: `Missing required column(s): ${idIdx === -1 ? "id " : ""}${finalPriceIdx === -1 ? "final_price" : ""}`.trim(),
    });
    return { rows, skippedBlank, errors };
  }

  for (let i = 1; i < csvRows.length; i++) {
    const rowNum = i + 1;
    const cols = csvRows[i];
    const id = (cols[idIdx] ?? "").trim();

    if (!id || !/^\d+$/.test(id)) {
      errors.push({ rowNum, id: id || null, error: `Invalid id "${id}" -- don't add or reorder rows, only edit the pricing columns.` });
      continue;
    }

    const finalPriceRaw = (cols[finalPriceIdx] ?? "").trim();
    const pctRaw = markupPctIdx === -1 ? "" : (cols[markupPctIdx] ?? "").trim();
    const dollarRaw = markupDollarIdx === -1 ? "" : (cols[markupDollarIdx] ?? "").trim();
    const filledCount = [finalPriceRaw, pctRaw, dollarRaw].filter((v) => v !== "").length;

    if (filledCount === 0) {
      skippedBlank.push({ rowNum, id });
      continue;
    }
    if (filledCount > 1) {
      errors.push({ rowNum, id, error: "Fill only one of final_price, markup_pct, or markup_dollar per row -- this row has more than one filled." });
      continue;
    }

    const csvCjCost = cjCostIdx === -1 ? null : parseOptionalMoney(cols[cjCostIdx] ?? "");
    const csvShippingCost = shippingIdx === -1 ? null : parseOptionalMoney(cols[shippingIdx] ?? "");

    let mode: PricingMode;
    let value: number;
    if (finalPriceRaw !== "") {
      mode = "fixed";
      value = Number(finalPriceRaw);
      if (!Number.isFinite(value) || value <= 0) {
        errors.push({ rowNum, id, error: `final_price "${finalPriceRaw}" must be a number greater than 0.` });
        continue;
      }
    } else if (pctRaw !== "") {
      mode = "pct";
      value = Number(pctRaw);
      if (!Number.isFinite(value)) {
        errors.push({ rowNum, id, error: `markup_pct "${pctRaw}" must be a number.` });
        continue;
      }
    } else {
      mode = "dollar";
      value = Number(dollarRaw);
      if (!Number.isFinite(value)) {
        errors.push({ rowNum, id, error: `markup_dollar "${dollarRaw}" must be a number.` });
        continue;
      }
    }

    rows.push({ rowNum, id, mode, value, csvCjCost, csvShippingCost });
  }

  return { rows, skippedBlank, errors };
}
