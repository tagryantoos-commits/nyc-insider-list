"use client";

import { CATEGORIES } from "@/lib/constants";
import type { TimeFilter, ViewMode } from "@/lib/types";

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
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export default function FilterBar({
  timeFilter,
  onTimeFilterChange,
  activeCategory,
  onCategoryChange,
  freeOnly,
  onFreeOnlyChange,
  totalCount,
}: Props) {
  return (
    <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#09090b]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-5">
        {/* Category tabs */}
        <div className="flex gap-0 overflow-x-auto border-b border-white/[0.04] pt-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`relative whitespace-nowrap px-3 pb-2.5 text-[13px] font-medium transition ${
              activeCategory === null
                ? "text-[#fafafa]"
                : "text-[#52525b] hover:text-[#71717a]"
            }`}
          >
            All
            {activeCategory === null && (
              <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#fafafa]" />
            )}
          </button>
          {CATEGORIES.filter((c) => c.key !== "Other").map((cat) => (
            <button
              key={cat.key}
              onClick={() =>
                onCategoryChange(activeCategory === cat.key ? null : cat.key)
              }
              className={`relative whitespace-nowrap px-3 pb-2.5 text-[13px] font-medium transition ${
                activeCategory === cat.key
                  ? "text-[#fafafa]"
                  : "text-[#52525b] hover:text-[#71717a]"
              }`}
            >
              {cat.label}
              {activeCategory === cat.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#fafafa]" />
              )}
            </button>
          ))}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="flex items-center gap-1">
            {TIME_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTimeFilterChange(tab.key)}
                className={`rounded px-2.5 py-1 text-[12px] font-medium transition ${
                  timeFilter === tab.key
                    ? "bg-white/[0.06] text-[#fafafa]"
                    : "text-[#52525b] hover:text-[#71717a]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#52525b]">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => onFreeOnlyChange(e.target.checked)}
                className="accent-emerald-500"
              />
              Free only
            </label>
            <span className="text-[12px] text-[#3f3f46]">
              {totalCount} results
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
