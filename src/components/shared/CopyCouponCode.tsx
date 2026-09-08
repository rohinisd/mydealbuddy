"use client";

import { useState } from "react";

export function CopyCouponCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent"
    >
      {copied ? "Copied ✓" : "Copy Code"}
    </button>
  );
}
