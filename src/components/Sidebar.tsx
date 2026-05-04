"use client";

import { CATEGORIES } from "@/lib/constants";
import type { TimeFilter, SortMode } from "@/lib/types";
import Link from "next/link";

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

export default function Sidebar({
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
  const timeOptions: { value: TimeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  return (
    <aside
      className="hidden lg:block shrink-0 sticky self-start overflow-y-auto border-r"
      style={{
        width: 200,
        top: 56,
        height: "calc(100vh - 56px)",
        borderColor: "var(--border)",
        background: "var(--bg-sidebar)",
      }}
    >
      <div style={{ padding: "20px 16px" }}>
        {/* Categories header */}
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          Events
        </h2>

        {/* Category list */}
        <div className="space-y-0.5">
          {/* All */}
          <button
            onClick={() => onCategoryChange(null)}
            className="flex w-full items-center gap-2 rounded-md transition"
            style={{
              height: 32,
              paddingLeft: 8,
              paddingRight: 8,
              background: activeCategory === null ? "var(--accent-subtle)" : "transparent",
              color: activeCategory === null ? "var(--text)" : "var(--text-secondary)",
              fontWeight: activeCategory === null ? 600 : 500,
              fontSize: 13,
            }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 6, height: 6, backgroundColor: "#6b7280" }}
            />
            <span className="flex-1 text-left">All</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{totalCount}</span>
          </button>

          {CATEGORIES.filter((c) => c.key !== "Other").map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onCategoryChange(isActive ? null : cat.key)}
                className="flex w-full items-center gap-2 rounded-md transition"
                style={{
                  height: 32,
                  paddingLeft: 8,
                  paddingRight: 8,
                  background: isActive ? "var(--accent-subtle)" : "transparent",
                  color: isActive ? "var(--text)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13,
                }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: 6, height: 6, backgroundColor: cat.color }}
                />
                <span className="flex-1 text-left">{cat.label}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters divider */}
        <div
          className="border-t"
          style={{ borderColor: "var(--border)", margin: "16px 0" }}
        />

        {/* Filters header */}
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          Filters
        </h2>

        <div className="space-y-2">
          <label
            className="flex items-center gap-2 cursor-pointer"
            style={{ color: "var(--text-secondary)", fontSize: 13 }}
          >
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => onFreeOnlyChange(e.target.checked)}
              className="accent-emerald-500"
            />
            Free events only
          </label>
          <label
            className="flex items-center gap-2 cursor-pointer"
            style={{ color: "var(--text-secondary)", fontSize: 13 }}
          >
            <input
              type="checkbox"
              checked={hideSoldOut}
              onChange={(e) => onHideSoldOutChange(e.target.checked)}
              className="accent-gray-500"
            />
            Hide sold out
          </label>

          {/* Sort */}
          <div style={{ marginTop: 8 }}>
            <select
              value={sortMode}
              onChange={(e) => onSortModeChange(e.target.value as SortMode)}
              className="w-full rounded-md border outline-none"
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
        </div>

        {/* Time divider */}
        <div
          className="border-t"
          style={{ borderColor: "var(--border)", margin: "16px 0" }}
        />

        {/* Time header */}
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          Time
        </h2>

        <div className="space-y-0.5">
          {timeOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-md cursor-pointer transition"
              style={{
                height: 32,
                paddingLeft: 8,
                paddingRight: 8,
                color: timeFilter === opt.value ? "var(--text)" : "var(--text-secondary)",
                fontWeight: timeFilter === opt.value ? 600 : 500,
                fontSize: 13,
              }}
            >
              <input
                type="radio"
                name="timeFilter"
                checked={timeFilter === opt.value}
                onChange={() => onTimeFilterChange(opt.value)}
                className="accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Subscribe CTA divider */}
        <div
          className="border-t"
          style={{ borderColor: "var(--border)", margin: "16px 0" }}
        />

        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>
          Get calendar access
        </p>
        <Link
          href="/subscribe"
          className="flex items-center justify-center rounded-md transition hover:opacity-90"
          style={{
            width: "100%",
            height: 36,
            background: "var(--text)",
            color: "var(--bg)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Subscribe $2.99/mo
        </Link>
      </div>
    </aside>
  );
}
