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
