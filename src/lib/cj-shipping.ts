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

// CJ doesn't validate the zip format against endCountryCode -- passing a real
// destination country here matters, since an unrelated country's zip/postal
// code silently returns that other country's shipping data with no error.
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

  const res = await fetch(`${CJ_API_BASE}/logistic/freightCalculate`, {
    method: "POST",
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({
      startCountryCode: "CN",
      endCountryCode: countryCode,
      zip,
      products: [{ vid, quantity }],
    }),
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
