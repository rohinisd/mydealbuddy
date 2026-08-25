import "server-only";
import { pool } from "@/lib/db";

export interface CustomerAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string | null;
  countryCode: string;
  country: string;
  province: string | null;
  city: string;
  addressLine: string;
  zip: string | null;
  isDefault: boolean;
}

function rowToAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: String(row.id),
    label: (row.label as string | null) ?? null,
    fullName: row.full_name as string,
    phone: (row.phone as string | null) ?? null,
    countryCode: row.country_code as string,
    country: row.country as string,
    province: (row.province as string | null) ?? null,
    city: row.city as string,
    addressLine: row.address_line as string,
    zip: (row.zip as string | null) ?? null,
    isDefault: row.is_default as boolean,
  };
}

export async function listAddresses(customerId: string): Promise<CustomerAddress[]> {
  const res = await pool.query(`SELECT * FROM customer_address WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`, [
    customerId,
  ]);
  return res.rows.map(rowToAddress);
}

export interface AddressInput {
  label?: string | null;
  fullName: string;
  phone?: string | null;
  countryCode: string;
  country: string;
  province?: string | null;
  city: string;
  addressLine: string;
  zip?: string | null;
  isDefault?: boolean;
}

export async function createAddress(customerId: string, input: AddressInput): Promise<CustomerAddress> {
  const existingRes = await pool.query(`SELECT COUNT(*) AS n FROM customer_address WHERE customer_id = $1`, [customerId]);
  const isFirst = Number(existingRes.rows[0].n) === 0;
  const makeDefault = isFirst || input.isDefault === true;

  if (makeDefault) {
    await pool.query(`UPDATE customer_address SET is_default = false WHERE customer_id = $1`, [customerId]);
  }

  const res = await pool.query(
    `INSERT INTO customer_address
       (customer_id, label, full_name, phone, country_code, country, province, city, address_line, zip, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      customerId,
      input.label || null,
      input.fullName,
      input.phone || null,
      input.countryCode,
      input.country,
      input.province || null,
      input.city,
      input.addressLine,
      input.zip || null,
      makeDefault,
    ]
  );
  return rowToAddress(res.rows[0]);
}

export async function deleteAddress(customerId: string, addressId: string): Promise<void> {
  await pool.query(`DELETE FROM customer_address WHERE id = $1 AND customer_id = $2`, [addressId, customerId]);
}

export async function setDefaultAddress(customerId: string, addressId: string): Promise<void> {
  await pool.query(`UPDATE customer_address SET is_default = false WHERE customer_id = $1`, [customerId]);
  await pool.query(`UPDATE customer_address SET is_default = true WHERE id = $1 AND customer_id = $2`, [addressId, customerId]);
}
