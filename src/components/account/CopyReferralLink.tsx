"use client";

import { useState } from "react";

export function CopyReferralLink({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(referralLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={referralLink}
        className="w-full rounded-md border border-border-strong bg-surface-grey px-3 py-2 text-sm text-text-secondary"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="btn-tracking shrink-0 rounded-md bg-accent px-6 py-2 text-sm font-bold uppercase text-white hover:opacity-90"
      >
        {copied ? "Copied ✓" : "Copy Link"}
      </button>
    </div>
  );
}
