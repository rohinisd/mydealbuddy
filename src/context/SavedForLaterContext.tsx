"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface SavedLine {
  productId: string;
  option?: string;
  quantity: number;
}

interface SavedForLaterContextValue {
  lines: SavedLine[];
  save: (productId: string, option: string | undefined, quantity: number) => void;
  remove: (productId: string, option?: string) => void;
  totalCount: number;
}

const SavedForLaterContext = createContext<SavedForLaterContextValue | null>(null);
const STORAGE_KEY = "mdb_saved_for_later_v1";

function sameLine(a: SavedLine, productId: string, option?: string) {
  return a.productId === productId && a.option === option;
}

export function SavedForLaterProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<SavedLine[]>([]);
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

  const save = useCallback((productId: string, option: string | undefined, quantity: number) => {
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

  const remove = useCallback((productId: string, option?: string) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, productId, option)));
  }, []);

  const totalCount = useMemo(() => lines.length, [lines]);

  const value = useMemo(() => ({ lines, save, remove, totalCount }), [lines, save, remove, totalCount]);

  return <SavedForLaterContext.Provider value={value}>{children}</SavedForLaterContext.Provider>;
}

export function useSavedForLater() {
  const ctx = useContext(SavedForLaterContext);
  if (!ctx) throw new Error("useSavedForLater must be used within a SavedForLaterProvider");
  return ctx;
}
