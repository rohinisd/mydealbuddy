import "server-only";
import { pool } from "@/lib/db";

const CJ_API_BASE = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";

export interface ShippingOption {
  method: string;
  cost: number;
  agingText: string;
  minDays: number | null;
  maxDays: number | null;
}

interface CjFreightOption {
  logisticName: string;
  logisticAging?: string;
  totalPostageFee: number;
}

interface CjWarehouseStock {
  countryCode: string;
  cjInventoryNum: number;
}

// product/stock/queryByVid returns per-warehouse stock. cjInventoryNum is
// stock physically at a CJ facility (ships today); factoryInventoryNum needs
// a procurement leg first and doesn't count as real same-day-dispatch stock.
async function getVariantWarehouseStock(vid: string, token: string): Promise<CjWarehouseStock[]> {
  const res = await fetch(`${CJ_API_BASE}/product/stock/queryByVid?vid=${encodeURIComponent(vid)}`, {
    headers: { "CJ-Access-Token": token },
  });
  const data = await res.json();
  if (data.code !== 200) return [];
  return ((data.data || []) as { countryCode: string; cjInventoryNum: number }[]).map((w) => ({
    countryCode: w.countryCode,
    cjInventoryNum: w.cjInventoryNum,
  }));
}

async function freightCalculate(
  vid: string,
  startCountryCode: string,
  endCountryCode: string,
  zip: string,
  quantity: number,
  token: string
): Promise<ShippingOption[]> {
  const res = await fetch(`${CJ_API_BASE}/logistic/freightCalculate`, {
    method: "POST",
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ startCountryCode, endCountryCode, zip, products: [{ vid, quantity }] }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || "Shipping estimate failed");

  const options = (data.data || []) as CjFreightOption[];
  return options
    .map((o) => {
      const [minStr, maxStr] = (o.logisticAging || "").split("-");
      return {
        method: o.logisticName,
        cost: o.totalPostageFee,
        agingText: o.logisticAging || "",
        minDays: minStr ? Number(minStr) : null,
        maxDays: maxStr ? Number(maxStr) : null,
      };
    })
    .sort((a, b) => a.cost - b.cost);
}

// CJ doesn't validate the zip format against endCountryCode -- passing a real
// destination country here matters, since an unrelated country's zip/postal
// code silently returns that other country's shipping data with no error.
//
// Origin warehouse: most of the catalog only has real stock in China, so
// quoting from there is the honest default. When a variant genuinely has
// stock at CJ's US warehouse (cjInventoryNum > 0, not just factory-backed),
// quote from there instead -- CJ's own logisticAging for that route then
// naturally reflects the faster domestic-to-US (or shorter international)
// transit time, with no hardcoded day counts on our side. The customer only
// ever sees the resulting cost/aging, never which warehouse it came from.
// Falls back to the China warehouse if the US route has no options for this
// destination, so a US-stocked product never becomes "unshippable" over a
// route gap that China would have covered.
export async function getShippingEstimate(
  productId: string,
  zip: string,
  countryCode: string,
  quantity = 1
): Promise<ShippingOption[]> {
  const token = process.env.CJ_ACCESS_TOKEN;
  if (!token) throw new Error("CJ_ACCESS_TOKEN missing from environment");

  const variantRes = await pool.query(`SELECT vid FROM cj_variant WHERE product_id = $1 ORDER BY id LIMIT 1`, [productId]);
  const vid = variantRes.rows[0]?.vid as string | undefined;
  if (!vid) throw new Error("No variant found for this product");

  // A stock-check hiccup shouldn't break an estimate that worked fine before
  // this lookup existed -- fall back to the CN-origin default on any failure.
  const warehouses = await getVariantWarehouseStock(vid, token).catch(() => []);
  const hasUsStock = warehouses.some((w) => w.countryCode === "US" && w.cjInventoryNum > 0);

  // Two sequential CJ calls now (stock check, then freight) -- both QPS=1/sec.
  await new Promise((resolve) => setTimeout(resolve, 1100));

  if (!hasUsStock) {
    return freightCalculate(vid, "CN", countryCode, zip, quantity, token);
  }

  const usOptions = await freightCalculate(vid, "US", countryCode, zip, quantity, token);
  if (usOptions.length > 0) return usOptions;

  await new Promise((resolve) => setTimeout(resolve, 1100));
  return freightCalculate(vid, "CN", countryCode, zip, quantity, token);
}
