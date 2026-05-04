"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import type { TimeFilter, SortMode } from "@/lib/types";

interface Props {
  activeCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
  freeOnly: boolean;
  onFreeOnlyChange: (v: boolean) => void;
  hideSoldOut: boolean;
  onHideSoldOutChange: (v: boolean) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (t: TimeFilter) => void;
  sortMode: SortMode;
  onSortModeChange: (s: SortMode) => void;
}

export default function MobileFilters({
  activeCategory,
  onCategoryChange,
  categoryCounts,
  totalCount,
  freeOnly,
  onFreeOnlyChange,
  hideSoldOut,
  onHideSoldOutChange,
  timeFilter,
  onTimeFilterChange,
  sortMode,
  onSortModeChange,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const timeOptions: { value: TimeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  return (
    <div className="lg:hidden sticky z-40" style={{ top: 56 }}>
      {/* Category tabs - horizontal scroll */}
      <div
        className="border-b overflow-x-auto hide-scrollbar"
        style={{ background: "var(--bg-filter-bar)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-1 px-4 py-2">
          <button
            onClick={() => onCategoryChange(null)}
            className="shrink-0 rounded-md transition"
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: activeCategory === null ? 600 : 500,
              background: activeCategory === null ? "var(--accent-subtle)" : "transparent",
              color: activeCategory === null ? "var(--text)" : "var(--text-muted)",
            }}
          >
            All ({totalCount})
          </button>

          {CATEGORIES.filter((c) => c.key !== "Other").map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onCategoryChange(isActive ? null : cat.key)}
                className="shrink-0 flex items-center gap-1.5 rounded-md transition"
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "var(--accent-subtle)" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                }}
              >
                <span
                  className="rounded-full"
                  style={{ width: 6, height: 6, backgroundColor: cat.color }}
                />
                {cat.label} ({count})
              </button>
            );
          })}

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0 flex items-center gap-1 ml-2 rounded-md transition"
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 500,
              color: showFilters ? "var(--text)" : "var(--text-muted)",
              background: showFilters ? "var(--accent-subtle)" : "transparent",
            }}
          >
            <SlidersHorizontal style={{ width: 12, height: 12 }} />
            Filters
          </button>
        </div>
      </div>

      {/* Filter dropdown */}
      {showFilters && (
        <div
          className="border-b"
          style={{
            background: "var(--bg-filter-bar)",
            borderColor: "var(--border)",
            padding: "12px 16px",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              Filters
            </span>
            <button onClick={() => setShowFilters(false)} style={{ color: "var(--text-muted)" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              <input type="checkbox" checked={freeOnly} onChange={(e) => onFreeOnlyChange(e.target.checked)} className="accent-emerald-500" />
              Free only
            </label>
            <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              <input type="checkbox" checked={hideSoldOut} onChange={(e) => onHideSoldOutChange(e.target.checked)} className="accent-gray-500" />
              Hide sold out
            </label>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
            {timeOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                <input
                  type="radio"
                  name="mobileTimeFilter"
                  checked={timeFilter === opt.value}
                  onChange={() => onTimeFilterChange(opt.value)}
                  className="accent-blue-500"
                />
                {opt.label}
              </label>
            ))}
          </div>

          <select
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as SortMode)}
            className="mt-3 w-full rounded-md border outline-none"
            style={{
              fontSize: 13,
              height: 32,
              paddingLeft: 8,
              paddingRight: 8,
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="date">Sort by date</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
      )}
    </div>
  );
}
