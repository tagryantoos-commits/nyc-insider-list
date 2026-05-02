"use client";

import { CATEGORIES } from "@/lib/constants";
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
}: Props) {
  return (
    <aside
      className="hidden lg:block w-[220px] shrink-0 sticky top-[49px] self-start overflow-y-auto border-r"
      style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)", height: "calc(100vh - 49px)" }}
    >
      <div className="p-4">
        {/* Categories */}
        <div className="space-y-0.5">
          <button
            onClick={() => onCategoryChange(null)}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition"
            style={{
              fontWeight: activeCategory === null ? 500 : 400,
              background: activeCategory === null ? "var(--border)" : "transparent",
              color: "var(--text)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#6b7280]" />
            <span className="flex-1 text-left">All</span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{totalCount}</span>
          </button>

          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onCategoryChange(isActive ? null : cat.key)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition"
                style={{
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? "var(--border)" : "transparent",
                  color: "var(--text)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 text-left">{cat.label}</span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t" style={{ borderColor: "var(--border)" }} />

        {/* Filters */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={freeOnly} onChange={(e) => onFreeOnlyChange(e.target.checked)} className="accent-emerald-500 rounded" />
            Free only
          </label>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={hideSoldOut} onChange={(e) => onHideSoldOutChange(e.target.checked)} className="accent-gray-500 rounded" />
            Hide sold out
          </label>
        </div>

        {/* Subscribe CTA */}
        <div className="mt-6">
          <Link
            href="/subscribe"
            className="block w-full rounded-md bg-[#111827] py-2 text-center text-[12px] font-medium text-white dark:bg-white dark:text-[#111827]"
          >
            Subscribe $2.99/mo
          </Link>
        </div>
      </div>
    </aside>
  );
}
