"use client";

import { useEffect, useState } from "react";

interface Leaf {
  id: string;
}
interface Group {
  id: string;
  name: string;
  leaves: Leaf[];
}
interface Top {
  id: string;
  name: string;
  groups: Group[];
}

const selectClass =
  "rounded-md border border-border-strong px-3 py-1.5 text-xs focus:border-accent focus:outline-none disabled:bg-surface-grey disabled:text-text-muted";

/**
 * Filters the (already-loaded) product list by category/subcategory --
 * products are only ever assigned a leaf (level 3) category, so "Men's
 * Clothing" or "Men's Clothing > Outerwear & Jackets" both need to resolve
 * to the full set of matching leaf ids before the parent can filter by them.
 */
export function CategoryFilter({ onChange }: { onChange: (leafIds: Set<string> | null) => void }) {
  const [tree, setTree] = useState<Top[]>([]);
  const [topId, setTopId] = useState("");
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data: Top[]) => setTree(data));
  }, []);

  const selectedTop = tree.find((t) => t.id === topId);

  function emit(nextTopId: string, nextGroupId: string) {
    if (!nextTopId) {
      onChange(null);
      return;
    }
    const top = tree.find((t) => t.id === nextTopId);
    if (!top) {
      onChange(null);
      return;
    }
    const groups = nextGroupId ? top.groups.filter((g) => g.id === nextGroupId) : top.groups;
    onChange(new Set(groups.flatMap((g) => g.leaves.map((l) => l.id))));
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={topId}
        disabled={tree.length === 0}
        onChange={(e) => {
          setTopId(e.target.value);
          setGroupId("");
          emit(e.target.value, "");
        }}
        className={selectClass}
      >
        <option value="">All categories</option>
        {tree.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <select
        value={groupId}
        disabled={!selectedTop}
        onChange={(e) => {
          setGroupId(e.target.value);
          emit(topId, e.target.value);
        }}
        className={selectClass}
      >
        <option value="">All subcategories</option>
        {selectedTop?.groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}
