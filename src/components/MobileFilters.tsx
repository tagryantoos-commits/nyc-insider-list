"use client";

import { CATEGORIES } from "@/lib/constants";

interface Props {
  activeCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
  freeOnly: boolean;
  onFreeOnlyChange: (v: boolean) => void;
}

export default function MobileFilters({
  activeCategory,
  onCategoryChange,
  categoryCounts,
  totalCount,
  freeOnly,
  onFreeOnlyChange,
}: Props) {
  return (
    <div
      className="lg:hidden sticky top-[49px] z-40 border-b overflow-x-auto"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-1 px-4 py-2">
        <button
          onClick={() => onCategoryChange(null)}
          className="shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium transition"
          style={{
            background: activeCategory === null ? "var(--border)" : "transparent",
            color: activeCategory === null ? "var(--text)" : "var(--text-muted)",
          }}
        >
          All ({totalCount})
        </button>
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.key] ?? 0;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(isActive ? null : cat.key)}
              className="shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition"
              style={{
                background: isActive ? "var(--border)" : "transparent",
                color: isActive ? "var(--text)" : "var(--text-muted)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.label} ({count})
            </button>
          );
        })}

        <label className="shrink-0 flex items-center gap-1 ml-2 text-[11px] cursor-pointer" style={{ color: "var(--text-muted)" }}>
          <input type="checkbox" checked={freeOnly} onChange={(e) => onFreeOnlyChange(e.target.checked)} className="accent-emerald-500" />
          Free
        </label>
      </div>
    </div>
  );
}
