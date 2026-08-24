"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomepageBlock, HomepageBlockType } from "@/lib/homepage-content";

interface SectionConfig {
  blockType: HomepageBlockType;
  title: string;
  description: string;
  addLabel: string;
  showPill: boolean;
  showBg: boolean;
}

const SECTIONS: SectionConfig[] = [
  {
    blockType: "hero_slide",
    title: "Hero Carousel",
    description: "Rotating banner at the top of the homepage.",
    addLabel: "Add Slide",
    showPill: true,
    showBg: true,
  },
  {
    blockType: "promo_banner",
    title: "Promo Banners",
    description: "The 3-column banner strip near the bottom of the homepage.",
    addLabel: "Add Banner",
    showPill: false,
    showBg: true,
  },
  {
    blockType: "deal_card",
    title: "Trending Affiliate Deals",
    description: "Scrollable deal cards row.",
    addLabel: "Add Deal",
    showPill: false,
    showBg: false,
  },
];

interface Draft {
  pill: string;
  headline: string;
  subcopy: string;
  cta: string;
  href: string;
  bg: string;
}

const EMPTY_DRAFT: Draft = { pill: "", headline: "", subcopy: "", cta: "", href: "", bg: "#eaf1f8" };

function blockToDraft(b: HomepageBlock): Draft {
  return { pill: b.pill ?? "", headline: b.headline, subcopy: b.subcopy ?? "", cta: b.cta ?? "", href: b.href, bg: b.bg };
}

export default function AdminHomepagePage() {
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newDrafts, setNewDrafts] = useState<Record<HomepageBlockType, Draft>>({
    hero_slide: EMPTY_DRAFT,
    promo_banner: EMPTY_DRAFT,
    deal_card: EMPTY_DRAFT,
  });
  const [creating, setCreating] = useState<HomepageBlockType | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/homepage-blocks");
    const data: HomepageBlock[] = await res.json();
    setBlocks(data);
    setDrafts(Object.fromEntries(data.map((b) => [b.id, blockToDraft(b)])));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(id: string, field: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function updateNewDraft(blockType: HomepageBlockType, field: keyof Draft, value: string) {
    setNewDrafts((prev) => ({ ...prev, [blockType]: { ...prev[blockType], [field]: value } }));
  }

  async function saveBlock(id: string) {
    const draft = drafts[id];
    if (!draft?.headline || !draft?.href) {
      setMessage("Headline and link are required.");
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/homepage-blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setMessage("Saved.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(block: HomepageBlock) {
    setBusyId(block.id);
    try {
      await fetch(`/api/admin/homepage-blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !block.isActive }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function move(id: string, direction: "up" | "down") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/homepage-blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move: direction }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/homepage-blocks/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function createBlock(blockType: HomepageBlockType) {
    const draft = newDrafts[blockType];
    if (!draft.headline || !draft.href) {
      setMessage("Headline and link are required.");
      return;
    }
    setCreating(blockType);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/homepage-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockType, ...draft }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setNewDrafts((prev) => ({ ...prev, [blockType]: EMPTY_DRAFT }));
      await load();
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Homepage Content</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      {message && <p className="mb-4 text-sm text-text-secondary">{message}</p>}

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        SECTIONS.map((section) => {
          const sectionBlocks = blocks.filter((b) => b.blockType === section.blockType);
          const newDraft = newDrafts[section.blockType];
          return (
            <div key={section.blockType} className="mb-10">
              <h2 className="text-lg font-semibold text-text-primary">{section.title}</h2>
              <p className="mb-3 text-xs text-text-muted">{section.description}</p>

              <div className="space-y-3">
                {sectionBlocks.map((block, i) => {
                  const draft = drafts[block.id] ?? blockToDraft(block);
                  return (
                    <div key={block.id} className="rounded-md border border-border p-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {section.showPill && (
                          <input
                            value={draft.pill}
                            onChange={(e) => updateDraft(block.id, "pill", e.target.value)}
                            placeholder="Pill label"
                            className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                          />
                        )}
                        <input
                          value={draft.headline}
                          onChange={(e) => updateDraft(block.id, "headline", e.target.value)}
                          placeholder="Headline"
                          className="col-span-2 rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none sm:col-span-2"
                        />
                        <input
                          value={draft.subcopy}
                          onChange={(e) => updateDraft(block.id, "subcopy", e.target.value)}
                          placeholder="Subcopy"
                          className="col-span-2 rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none sm:col-span-3"
                        />
                        <input
                          value={draft.cta}
                          onChange={(e) => updateDraft(block.id, "cta", e.target.value)}
                          placeholder="Button text"
                          className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        <input
                          value={draft.href}
                          onChange={(e) => updateDraft(block.id, "href", e.target.value)}
                          placeholder="Link (e.g. /shop)"
                          className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                        />
                        {section.showBg && (
                          <input
                            value={draft.bg}
                            onChange={(e) => updateDraft(block.id, "bg", e.target.value)}
                            placeholder="Background (#hex)"
                            className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                          />
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === block.id}
                          onClick={() => saveBlock(block.id)}
                          className="rounded-md bg-accent px-3 py-1 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={busyId === block.id || i === 0}
                          onClick={() => move(block.id, "up")}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={busyId === block.id || i === sectionBlocks.length - 1}
                          onClick={() => move(block.id, "down")}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={busyId === block.id}
                          onClick={() => toggleActive(block)}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                        >
                          {block.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === block.id}
                          onClick={() => remove(block.id)}
                          className="rounded-md border border-border-strong px-2 py-1 text-xs font-semibold text-discount hover:border-discount disabled:opacity-60"
                        >
                          Delete
                        </button>
                        <span
                          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            block.isActive ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-text-muted"
                          }`}
                        >
                          {block.isActive ? "Live" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {sectionBlocks.length === 0 && <p className="text-sm text-text-muted">Nothing here yet.</p>}
              </div>

              <div className="mt-3 rounded-md border border-dashed border-border-strong p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-text-muted">Add new</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {section.showPill && (
                    <input
                      value={newDraft.pill}
                      onChange={(e) => updateNewDraft(section.blockType, "pill", e.target.value)}
                      placeholder="Pill label"
                      className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                  )}
                  <input
                    value={newDraft.headline}
                    onChange={(e) => updateNewDraft(section.blockType, "headline", e.target.value)}
                    placeholder="Headline"
                    className="col-span-2 rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none sm:col-span-2"
                  />
                  <input
                    value={newDraft.subcopy}
                    onChange={(e) => updateNewDraft(section.blockType, "subcopy", e.target.value)}
                    placeholder="Subcopy"
                    className="col-span-2 rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none sm:col-span-3"
                  />
                  <input
                    value={newDraft.cta}
                    onChange={(e) => updateNewDraft(section.blockType, "cta", e.target.value)}
                    placeholder="Button text"
                    className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                  />
                  <input
                    value={newDraft.href}
                    onChange={(e) => updateNewDraft(section.blockType, "href", e.target.value)}
                    placeholder="Link (e.g. /shop)"
                    className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                  />
                  {section.showBg && (
                    <input
                      value={newDraft.bg}
                      onChange={(e) => updateNewDraft(section.blockType, "bg", e.target.value)}
                      placeholder="Background (#hex)"
                      className="rounded-md border border-border-strong px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                  )}
                </div>
                <button
                  type="button"
                  disabled={creating === section.blockType}
                  onClick={() => createBlock(section.blockType)}
                  className="btn-tracking mt-2 rounded-md bg-accent px-3 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
                >
                  {creating === section.blockType ? "Adding..." : section.addLabel}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
