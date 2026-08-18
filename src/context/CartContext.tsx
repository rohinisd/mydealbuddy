"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartLine {
  productId: string;
  option?: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (productId: string, option?: string, quantity?: number) => void;
  removeItem: (productId: string, option?: string) => void;
  setQuantity: (productId: string, option: string | undefined, quantity: number) => void;
  clear: () => void;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mdb_cart_v1";

function sameLine(a: CartLine, productId: string, option?: string) {
  return a.productId === productId && a.option === option;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // State must start empty to match server-rendered HTML, then sync from
    // localStorage after mount — reading it during the initial render would
    // cause a hydration mismatch.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a browser-only store, see comment above
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem = useCallback((productId: string, option?: string, quantity = 1) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => sameLine(l, productId, option));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { productId, option, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string, option?: string) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, productId, option)));
  }, []);

  const setQuantity = useCallback((productId: string, option: string | undefined, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => !sameLine(l, productId, option))
        : prev.map((l) => (sameLine(l, productId, option) ? { ...l, quantity } : l))
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  const value = useMemo(
    () => ({ lines, addItem, removeItem, setQuantity, clear, totalCount }),
    [lines, addItem, removeItem, setQuantity, clear, totalCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
