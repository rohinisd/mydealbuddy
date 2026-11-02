"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface CouponContextValue {
  applied: AppliedCoupon | null;
  setApplied: (coupon: AppliedCoupon | null) => void;
  clear: () => void;
}

const CouponContext = createContext<CouponContextValue | null>(null);
const STORAGE_KEY = "mdb_coupon_v1";

export function CouponProvider({ children }: { children: React.ReactNode }) {
  const [applied, setAppliedState] = useState<AppliedCoupon | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Same hydration-safe pattern as CartContext: start empty to match SSR
    // output, then sync from localStorage after mount.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a browser-only store
      if (raw) setAppliedState(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (applied) localStorage.setItem(STORAGE_KEY, JSON.stringify(applied));
    else localStorage.removeItem(STORAGE_KEY);
  }, [applied, hydrated]);

  const value = useMemo(
    () => ({ applied, setApplied: setAppliedState, clear: () => setAppliedState(null) }),
    [applied]
  );

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export function useCoupon() {
  const ctx = useContext(CouponContext);
  if (!ctx) throw new Error("useCoupon must be used within a CouponProvider");
  return ctx;
}

/**
 * Keeps an applied coupon honest against the CURRENT cart. Without this, an
 * applied coupon is just replayed from localStorage forever -- it never
 * notices the admin deactivated it, that the cart has dropped below its
 * minimum order, or that the subtotal (and therefore a percent discount)
 * has changed since it was computed. Re-validates whenever the applied
 * code or the subtotal changes, and on first mount once the caller's own
 * data is ready (`ready` lets a page hold off during its product-loading
 * state, so a transient subtotal of 0 doesn't wrongly clear a genuinely
 * valid coupon). Returns the rejection reason the moment a coupon stops
 * being valid, so the page can tell the customer why it disappeared instead
 * of silently zeroing the discount.
 */
export function useCouponRevalidation(subtotal: number, ready: boolean): string | null {
  const { applied, setApplied } = useCoupon();
  const code = applied?.code ?? null;
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !code) {
      setInvalidReason(null);
      return;
    }
    let cancelled = false;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.valid) {
          setInvalidReason(null);
          setApplied({ code, discountAmount: data.discountAmount });
        } else {
          setInvalidReason(data.reason || "This coupon is no longer valid.");
          setApplied(null);
        }
      })
      .catch(() => {
        // A network hiccup shouldn't silently drop a coupon that was valid a
        // moment ago -- leave existing state as-is, the next cart change (or
        // the final server-side check at order placement) will retry/catch it.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setApplied is a stable function identity from the provider's useMemo
  }, [ready, code, subtotal]);

  return invalidReason;
}
