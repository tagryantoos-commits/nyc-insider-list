"use client";

import { useState, useMemo } from "react";
import type { Event, TimeFilter, SortMode } from "@/lib/types";
import {
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  addDays,
  addMonths,
} from "date-fns";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileFilters from "./MobileFilters";
import FeaturedEvents from "./FeaturedEvents";
import DateGroup from "./DateGroup";
import EventCard from "./EventCard";
import SubscribeCTA from "./SubscribeCTA";

function parsePrice(cost: string | null): number {
  if (!cost) return 0;
  const match = cost.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-lg border"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        borderLeftWidth: 2,
        borderLeftColor: "var(--border)",
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="skeleton-pulse" style={{ width: 60, height: 11 }} />
        <div className="skeleton-pulse" style={{ width: 40, height: 13 }} />
      </div>
      <div className="skeleton-pulse" style={{ width: "80%", height: 15, marginTop: 8 }} />
      <div className="skeleton-pulse" style={{ width: "60%", height: 12, marginTop: 8 }} />
    </div>
  );
}

export default function EventExplorer({
  events,
  featured,
}: {
  events: Event[];
  featured: Event[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");

  const filtered = useMemo(() => {
    const now = startOfDay(new Date());
    let result = events.filter((e) => !isBefore(parseISO(e.date), now));

    // Time filter
    if (timeFilter === "today") {
      const todayEnd = endOfDay(new Date());
      result = result.filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, now) && !isAfter(d, todayEnd);
      });
    } else if (timeFilter === "week") {
      const weekEnd = endOfDay(addDays(new Date(), 7));
      result = result.filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, now) && !isAfter(d, weekEnd);
      });
    } else if (timeFilter === "month") {
      const monthEnd = endOfDay(addMonths(new Date(), 1));
      result = result.filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, now) && !isAfter(d, monthEnd);
      });
    }

    if (activeCategory) result = result.filter((e) => e.category === activeCategory);
    if (freeOnly) result = result.filter((e) => e.is_free);
    if (hideSoldOut) {
      result = result.filter(
        (e) =>
          !e.title.toLowerCase().includes("sold out") &&
          !(e.description ?? "").toLowerCase().includes("sold out"),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.venue ?? "").toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.neighborhood ?? "").toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortMode === "date") {
      result.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortMode === "price-low") {
      result.sort((a, b) => parsePrice(a.cost) - parsePrice(b.cost));
    } else if (sortMode === "price-high") {
      result.sort((a, b) => parsePrice(b.cost) - parsePrice(a.cost));
    }

    return result;
  }, [events, searchQuery, activeCategory, freeOnly, hideSoldOut, timeFilter, sortMode]);

  // Category counts (from filtered-minus-category so counts update correctly)
  const categoryCounts = useMemo(() => {
    const now = startOfDay(new Date());
    let base = events.filter((e) => !isBefore(parseISO(e.date), now));

    // Apply time filter to counts
    if (timeFilter === "today") {
      const todayEnd = endOfDay(new Date());
      base = base.filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, now) && !isAfter(d, todayEnd);
      });
    } else if (timeFilter === "week") {
      const weekEnd = endOfDay(addDays(new Date(), 7));
      base = base.filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, now) && !isAfter(d, weekEnd);
      });
    } else if (timeFilter === "month") {
      const monthEnd = endOfDay(addMonths(new Date(), 1));
      base = base.filter((e) => {
        const d = parseISO(e.date);
        return !isBefore(d, now) && !isAfter(d, monthEnd);
      });
    }

    if (freeOnly) base = base.filter((e) => e.is_free);
    if (hideSoldOut) {
      base = base.filter(
        (e) =>
          !e.title.toLowerCase().includes("sold out") &&
          !(e.description ?? "").toLowerCase().includes("sold out"),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.venue ?? "").toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q),
      );
    }
    const counts: Record<string, number> = {};
    for (const e of base) counts[e.category] = (counts[e.category] ?? 0) + 1;
    return counts;
  }, [events, freeOnly, hideSoldOut, searchQuery, timeFilter]);

  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  // Group by date
  const dateGroups = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    for (const e of filtered) {
      (groups[e.date] ??= []).push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const isSearching = searchQuery.trim().length > 0;
  const showFeatured = !activeCategory && !isSearching && featured.length > 0 && timeFilter === "all";
  const isLoading = events.length === 0;

  return (
    <>
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <MobileFilters
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categoryCounts={categoryCounts}
        totalCount={totalCount}
        freeOnly={freeOnly}
        onFreeOnlyChange={setFreeOnly}
        hideSoldOut={hideSoldOut}
        onHideSoldOutChange={setHideSoldOut}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
      />

      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          categoryCounts={categoryCounts}
          totalCount={totalCount}
          freeOnly={freeOnly}
          onFreeOnlyChange={setFreeOnly}
          hideSoldOut={hideSoldOut}
          onHideSoldOutChange={setHideSoldOut}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />

        <main className="flex-1 min-w-0 px-4 py-5 lg:px-6">
          {/* Skeleton loading */}
          {isLoading && (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!isLoading && (
            <>
              {showFeatured && <FeaturedEvents events={featured} />}

              {isSearching || sortMode !== "date" ? (
                /* Flat grid when searching or sorting by price */
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              ) : (
                /* Date-grouped view */
                dateGroups.map(([date, evts]) => (
                  <DateGroup key={date} date={date} events={evts} />
                ))
              )}

              {filtered.length === 0 && (
                <div className="py-20 text-center">
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                    No events found
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Try adjusting your filters or search
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <SubscribeCTA />
      <footer
        className="border-t py-5 text-center"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-muted)",
          fontSize: 11,
        }}
      >
        &copy; {new Date().getFullYear()} NYC Insider List
      </footer>
    </>
  );
}
