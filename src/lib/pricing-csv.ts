// Pure, framework-agnostic CSV helpers -- used both client-side (export button,
// no network round-trip needed since the admin page already has the product
// list loaded) and server-side (import route re-parses the re-uploaded file).

export const PRICING_CSV_HEADER = [
  "id",
  "name",
  "category",
  "pid",
  "cj_cost",
  "shipping_cost",
  "total_cost",
  "cj_suggested_price",
  "final_price",
] as const;

export interface PricingCsvSourceRow {
  id: string;
  name: string;
  category: string | null;
  pid: string;
  cjCost: number | null;
  shippingCost: number | null;
  priceMin: number | null;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Admin fills in the blank final_price column in Excel/Sheets, then re-uploads via importPricingCsv. */
export function buildPricingCsv(rows: PricingCsvSourceRow[]): string {
  const lines = [PRICING_CSV_HEADER.join(",")];
  for (const r of rows) {
    const totalCost = r.cjCost != null && r.shippingCost != null ? r.cjCost + r.shippingCost : null;
    lines.push(
      [
        r.id,
        csvEscape(r.name),
        csvEscape(r.category ?? ""),
        r.pid,
        r.cjCost != null ? r.cjCost.toFixed(2) : "",
        r.shippingCost != null ? r.shippingCost.toFixed(2) : "",
        totalCost != null ? totalCost.toFixed(2) : "",
        r.priceMin != null ? r.priceMin.toFixed(2) : "",
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

export interface ParsedPricingCsv {
  priced: { id: string; price: number; csvCjCost: number | null; csvShippingCost: number | null }[];
  skippedBlank: PricingCsvRowResult[];
  errors: PricingCsvRowResult[];
}

function parseOptionalMoney(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/** Parses what buildPricingCsv produced after an admin edited the final_price column. */
export function parsePricingCsv(text: string): ParsedPricingCsv {
  const rows = parseCsvRows(text);
  const priced: ParsedPricingCsv["priced"] = [];
  const skippedBlank: PricingCsvRowResult[] = [];
  const errors: PricingCsvRowResult[] = [];

  if (rows.length === 0) {
    errors.push({ rowNum: 1, id: null, error: "File is empty." });
    return { priced, skippedBlank, errors };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf("id");
  const finalPriceIdx = header.indexOf("final_price");
  const cjCostIdx = header.indexOf("cj_cost");
  const shippingIdx = header.indexOf("shipping_cost");
  if (idIdx === -1 || finalPriceIdx === -1) {
    errors.push({ rowNum: 1, id: null, error: `Missing required column(s): ${idIdx === -1 ? "id" : ""} ${finalPriceIdx === -1 ? "final_price" : ""}`.trim() });
    return { priced, skippedBlank, errors };
  }

  for (let i = 1; i < rows.length; i++) {
    const rowNum = i + 1;
    const cols = rows[i];
    const id = (cols[idIdx] ?? "").trim();
    const finalPriceRaw = (cols[finalPriceIdx] ?? "").trim();

    if (!id || !/^\d+$/.test(id)) {
      errors.push({ rowNum, id: id || null, error: `Invalid id "${id}" -- don't add or reorder rows, only edit final_price.` });
      continue;
    }
    if (finalPriceRaw === "") {
      skippedBlank.push({ rowNum, id });
      continue;
    }
    const price = Number(finalPriceRaw);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push({ rowNum, id, error: `final_price "${finalPriceRaw}" must be a number greater than 0.` });
      continue;
    }
    priced.push({
      id,
      price,
      csvCjCost: cjCostIdx === -1 ? null : parseOptionalMoney(cols[cjCostIdx] ?? ""),
      csvShippingCost: shippingIdx === -1 ? null : parseOptionalMoney(cols[shippingIdx] ?? ""),
    });
  }

  return { priced, skippedBlank, errors };
}
