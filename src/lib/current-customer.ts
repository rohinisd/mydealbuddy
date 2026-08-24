import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSessionCustomer } from "@/lib/customer-session";
import type { Customer } from "@/lib/customers";

export async function getCurrentCustomer(): Promise<Customer | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionCustomer(token);
}
