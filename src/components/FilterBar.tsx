"use client";

import { CATEGORIES } from "@/lib/constants";
import type { TimeFilter, ViewMode } from "@/lib/types";
import { LayoutGrid, List } from "lucide-react";

interface Props {
  timeFilter: TimeFilter;
  onTimeFilterChange: (f: TimeFilter) => void;
  activeCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  freeOnly: boolean;
  onFreeOnlyChange: (v: boolean) => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
}

const TIME_TABS: { key: TimeFilter; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "upcoming", label: "Upcoming" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export default function FilterBar({
  timeFilter,
  onTimeFilterChange,
  activeCategory,
  onCategoryChange,
  viewMode,
  onViewModeChange,
  freeOnly,
  onFreeOnlyChange,
  categoryCounts,
  totalCount,
}: Props) {
  return (
    <div className="sticky top-[53px] z-40 border-b border-white/[0.06] bg-[#080b16]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {/* Time tabs + view toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 overflow-x-auto">
            {TIME_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTimeFilterChange(tab.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  timeFilter === tab.key
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-1.5 text-xs text-white/40 sm:flex">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => onFreeOnlyChange(e.target.checked)}
                className="rounded border-white/20 bg-white/5 accent-emerald-500"
              />
              Free only
            </label>

            <span className="hidden text-xs text-white/30 sm:inline">
              {totalCount} results
            </span>

            <div className="flex rounded-lg border border-white/[0.08] p-0.5">
              <button
                onClick={() => onViewModeChange("cards")}
                className={`rounded-md p-1.5 transition ${
                  viewMode === "cards" ? "bg-white/10 text-white" : "text-white/30"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={`rounded-md p-1.5 transition ${
                  viewMode === "list" ? "bg-white/10 text-white" : "text-white/30"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              activeCategory === null
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            All ({totalCount})
          </button>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            if (count === 0) return null;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onCategoryChange(isActive ? null : cat.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
                style={isActive ? { backgroundColor: `${cat.color}25`, color: cat.color } : {}}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
