"use client";

import { useState } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";

const REFERRAL_CODE = "BUDDY-PREVIEW";

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://mydealbuddy.com/?ref=${REFERRAL_CODE}`;

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(referralLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <AccountLayout title="Referrals">
      <div className="rounded-md border border-dashed border-discount bg-surface-soft px-4 py-3 text-sm text-text-secondary">
        Preview data — real referral codes and attribution will be generated once auth and the
        Neon-backed referrals API are connected (integration map §9).
      </div>

      <p className="mt-6 text-sm text-text-secondary">
        Share your link — when a friend makes their first purchase, you both earn Buddy Coins.
      </p>

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

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">0</p>
          <p className="mt-1 text-xs text-text-muted">Friends Referred</p>
        </div>
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">0</p>
          <p className="mt-1 text-xs text-text-muted">Coins Earned</p>
        </div>
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">50</p>
          <p className="mt-1 text-xs text-text-muted">Coins per Referral</p>
        </div>
      </div>
    </AccountLayout>
  );
}
