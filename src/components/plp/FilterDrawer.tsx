"use client";

import { useEffect } from "react";
import { XIcon } from "@/components/icons/Icons";

export function FilterDrawer({
  open,
  onClose,
  resultCount,
  children,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5 text-text-secondary" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-tracking w-full rounded-md bg-accent py-3 text-sm font-bold uppercase text-white"
          >
            Show {resultCount} results
          </button>
        </div>
      </div>
    </div>
  );
}
