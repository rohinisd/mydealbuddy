"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Campaign } from "@/lib/campaigns";

function isLive(c: Campaign): boolean {
  const now = Date.now();
  return c.isActive && new Date(c.startsAt).getTime() <= now && now <= new Date(c.endsAt).getTime();
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [coinBonusType, setCoinBonusType] = useState<"none" | "multiplier" | "flat">("none");
  const [coinBonusValue, setCoinBonusValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadCampaigns() {
    setLoading(true);
    const res = await fetch("/api/admin/campaigns");
    setCampaigns(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bannerText,
          coinBonusType,
          coinBonusValue: Number(coinBonusValue) || 0,
          startsAt: startsAt ? new Date(startsAt).toISOString() : "",
          endsAt: endsAt ? new Date(endsAt).toISOString() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage(`Created "${data.title}"`);
      setTitle("");
      setBannerText("");
      setCoinBonusType("none");
      setCoinBonusValue("");
      setStartsAt("");
      setEndsAt("");
      await loadCampaigns();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(campaign: Campaign) {
    setBusyId(campaign.id);
    try {
      await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !campaign.isActive }),
      });
      await loadCampaigns();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(campaign: Campaign) {
    if (!confirm(`Delete "${campaign.title}"? This can't be undone.`)) return;
    setBusyId(campaign.id);
    try {
      await fetch(`/api/admin/campaigns/${campaign.id}`, { method: "DELETE" });
      await loadCampaigns();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Campaigns</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      <p className="mb-4 text-sm text-text-secondary">
        Runs a site-wide banner for the date range below, and optionally boosts Buddy Coins earned on every order
        during that window -- either multiplying the usual amount (stacks with a customer&apos;s loyalty tier), or
        crediting a flat bonus per order. For a price discount, create a{" "}
        <Link href="/admin/coupons" className="font-semibold text-accent hover:underline">
          coupon
        </Link>{" "}
        instead and mention the code in the banner text here.
      </p>

      <form onSubmit={handleCreate} className="mb-8 flex flex-col gap-3 rounded-md border border-border p-4">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Internal title (e.g. Halloween Sale)"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <textarea
          required
          rows={2}
          value={bannerText}
          onChange={(e) => setBannerText(e.target.value)}
          placeholder="Banner text shown to customers site-wide, e.g. 🎃 Halloween Sale — 20% off with code SPOOKY20, plus earn 2x Buddy Coins!"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            value={coinBonusType}
            onChange={(e) => setCoinBonusType(e.target.value as typeof coinBonusType)}
            className="rounded-md border border-border-strong px-2 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="none">No coin bonus</option>
            <option value="multiplier">Coin multiplier</option>
            <option value="flat">Flat bonus per order</option>
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            disabled={coinBonusType === "none"}
            value={coinBonusValue}
            onChange={(e) => setCoinBonusValue(e.target.value)}
            placeholder={coinBonusType === "multiplier" ? "e.g. 2 for 2x" : coinBonusType === "flat" ? "e.g. 50 coins" : "—"}
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            required
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create Campaign"}
        </button>
        {message && <p className="text-sm text-text-secondary">{message}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-text-muted">No campaigns yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text-primary">{c.title}</p>
                <p className="truncate text-xs text-text-muted">{c.bannerText}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(c.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} –{" "}
                  {new Date(c.endsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {c.coinBonusType === "multiplier" && ` · ${c.coinBonusValue}x Buddy Coins`}
                  {c.coinBonusType === "flat" && ` · +${c.coinBonusValue} flat Buddy Coins/order`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isLive(c) ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-text-muted"
                }`}
              >
                {isLive(c) ? "Live now" : c.isActive ? "Scheduled/Ended" : "Disabled"}
              </span>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => toggleActive(c)}
                className="shrink-0 rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
              >
                {c.isActive ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => handleDelete(c)}
                className="shrink-0 rounded-md border border-discount px-3 py-1.5 text-xs font-semibold text-discount hover:bg-discount/10 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
