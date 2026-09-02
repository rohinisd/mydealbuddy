"use client";

import { useEffect, useState } from "react";

interface Leaf {
  id: string;
  slug: string;
  name: string;
  fullSlug: string;
}
interface Group {
  id: string;
  slug: string;
  name: string;
  fullSlug: string;
  leaves: Leaf[];
}
interface Top {
  id: string;
  slug: string;
  name: string;
  fullSlug: string;
  groups: Group[];
}

const selectClass =
  "rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:bg-surface-grey disabled:text-text-muted";

// Full CJ tree (14 top / 89 group / 572 leaf categories) -- fetched once and
// cascaded locally rather than round-tripping per level, since it's small
// enough (~675 rows) to hold in memory for the lifetime of the admin page.
export function CategoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (leafId: string) => void;
  disabled?: boolean;
}) {
  const [tree, setTree] = useState<Top[]>([]);
  const [topId, setTopId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [leafId, setLeafId] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data: Top[]) => setTree(data));
  }, []);

  // Once the tree is loaded, resolve `value` (a leaf id) to its top/group ancestors.
  useEffect(() => {
    if (!value || tree.length === 0) return;
    for (const top of tree) {
      for (const group of top.groups) {
        const leaf = group.leaves.find((l) => l.id === value);
        if (leaf) {
          setTopId(top.id);
          setGroupId(group.id);
          setLeafId(leaf.id);
          return;
        }
      }
    }
  }, [value, tree]);

  const selectedTop = tree.find((t) => t.id === topId);
  const selectedGroup = selectedTop?.groups.find((g) => g.id === groupId);

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={topId}
        disabled={disabled || tree.length === 0}
        onChange={(e) => {
          setTopId(e.target.value);
          setGroupId("");
          setLeafId("");
        }}
        className={selectClass}
      >
        <option value="">{tree.length === 0 ? "Loading..." : "Category"}</option>
        {tree.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <select
        value={groupId}
        disabled={disabled || !selectedTop}
        onChange={(e) => {
          setGroupId(e.target.value);
          setLeafId("");
        }}
        className={selectClass}
      >
        <option value="">Subcategory</option>
        {selectedTop?.groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        value={leafId}
        disabled={disabled || !selectedGroup}
        onChange={(e) => {
          setLeafId(e.target.value);
          if (e.target.value) onChange(e.target.value);
        }}
        className={selectClass}
      >
        <option value="">Specific category</option>
        {selectedGroup?.leaves.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
