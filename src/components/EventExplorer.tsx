"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { Event, TimeFilter, SortMode } from "@/lib/types";
import {
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  addDays,
  addMonths,
  format,
  isToday,
  isTomorrow,
} from "date-fns";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileFilters from "./MobileFilters";
import DateGroup from "./DateGroup";
import EventCard from "./EventCard";
import SubscribeCTA from "./SubscribeCTA";
import Footer from "./Footer";

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
      <div className="skeleton-pulse" style={{ width: "80%", height: 14, marginTop: 8 }} />
      <div className="skeleton-pulse" style={{ width: "60%", height: 12, marginTop: 8 }} />
    </div>
  );
}

// Generate upcoming date chips
function getDateChips(): { label: string; date: Date }[] {
  const chips: { label: string; date: Date }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    let label: string;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Tomorrow";
    else label = format(d, "EEE");
    chips.push({ label, date: d });
  }
  return chips;
}

export default function EventExplorer({
  events,
  initialCategory,
  initialSearch,
}: {
  events: Event[];
  initialCategory?: string | null;
  initialSearch?: string;
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
  const [activeBorough, setActiveBorough] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null);
  const [activeNeighborhood, setActiveNeighborhood] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Load saved events from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nyc-saved-events");
      if (saved) setSavedIds(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("nyc-saved-events", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const dateChips = useMemo(() => getDateChips(), []);

  // Reset neighborhood when borough changes
  useEffect(() => {
    setActiveNeighborhood(null);
  }, [activeBorough]);

  const filtered = useMemo(() => {
    const now = startOfDay(new Date());
    let result = events.filter((e) => !isBefore(parseISO(e.date), now));

    // Date chip filter takes priority
    if (activeDate) {
      result = result.filter((e) => e.date === activeDate);
    } else if (timeFilter === "today") {
      const todayEnd = endOfDay(new Date());
      result = result.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, todayEnd); });
    } else if (timeFilter === "week") {
      const weekEnd = endOfDay(addDays(new Date(), 7));
      result = result.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, weekEnd); });
    } else if (timeFilter === "month") {
      const monthEnd = endOfDay(addMonths(new Date(), 1));
      result = result.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, monthEnd); });
    }

    if (activeBorough) result = result.filter((e) => e.borough === activeBorough);
    if (activeNeighborhood) result = result.filter((e) => e.neighborhood === activeNeighborhood);
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

    if (sortMode === "date") {
      result.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortMode === "price-low") {
      result.sort((a, b) => parsePrice(a.cost) - parsePrice(b.cost));
    } else if (sortMode === "price-high") {
      result.sort((a, b) => parsePrice(b.cost) - parsePrice(a.cost));
    }

    return result;
  }, [events, searchQuery, activeBorough, activeNeighborhood, activeCategory, freeOnly, hideSoldOut, timeFilter, sortMode, activeDate]);

  const categoryCounts = useMemo(() => {
    const now = startOfDay(new Date());
    let base = events.filter((e) => !isBefore(parseISO(e.date), now));

    if (activeDate) {
      base = base.filter((e) => e.date === activeDate);
    } else if (timeFilter === "today") {
      const todayEnd = endOfDay(new Date());
      base = base.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, todayEnd); });
    } else if (timeFilter === "week") {
      const weekEnd = endOfDay(addDays(new Date(), 7));
      base = base.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, weekEnd); });
    } else if (timeFilter === "month") {
      const monthEnd = endOfDay(addMonths(new Date(), 1));
      base = base.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, monthEnd); });
    }

    if (activeBorough) base = base.filter((e) => e.borough === activeBorough);
    if (activeNeighborhood) base = base.filter((e) => e.neighborhood === activeNeighborhood);
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
  }, [events, activeBorough, activeNeighborhood, freeOnly, hideSoldOut, searchQuery, timeFilter, activeDate]);

  const boroughCounts = useMemo(() => {
    const now = startOfDay(new Date());
    let base = events.filter((e) => !isBefore(parseISO(e.date), now));

    if (activeDate) {
      base = base.filter((e) => e.date === activeDate);
    } else if (timeFilter === "today") {
      const todayEnd = endOfDay(new Date());
      base = base.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, todayEnd); });
    } else if (timeFilter === "week") {
      const weekEnd = endOfDay(addDays(new Date(), 7));
      base = base.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, weekEnd); });
    } else if (timeFilter === "month") {
      const monthEnd = endOfDay(addMonths(new Date(), 1));
      base = base.filter((e) => { const d = parseISO(e.date); return !isBefore(d, now) && !isAfter(d, monthEnd); });
    }

    const counts: Record<string, number> = {};
    for (const e of base) {
      const b = e.borough ?? "Manhattan";
      counts[b] = (counts[b] ?? 0) + 1;
    }
    return counts;
  }, [events, timeFilter, activeDate]);

  // Neighborhood counts for the selected borough
  const neighborhoodCounts = useMemo(() => {
    if (!activeBorough) return {};
    const now = startOfDay(new Date());
    const base = events.filter(
      (e) => !isBefore(parseISO(e.date), now) && e.borough === activeBorough && e.neighborhood,
    );
    const counts: Record<string, number> = {};
    for (const e of base) {
      const n = e.neighborhood!;
      counts[n] = (counts[n] ?? 0) + 1;
    }
    return counts;
  }, [events, activeBorough]);

  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const dateGroups = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    for (const e of filtered) {
      (groups[e.date] ??= []).push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const isSearching = searchQuery.trim().length > 0;
  const isLoading = events.length === 0;

  // Build empty state message
  const emptyMessage = useMemo(() => {
    if (activeCategory) {
      const catName = activeCategory;
      if (activeDate) return `No ${catName} events on this date`;
      if (timeFilter === "today") return `No ${catName} events today -- check back tomorrow`;
      if (timeFilter === "week") return `No ${catName} events this week -- check next week`;
      return `No ${catName} events found`;
    }
    if (activeDate) return "No events on this date";
    if (isSearching) return "No events match your search";
    return "No events found";
  }, [activeCategory, activeDate, timeFilter, isSearching]);

  return (
    <>
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} showSearchBar />
      <MobileFilters
        activeBorough={activeBorough}
        onBoroughChange={setActiveBorough}
        boroughCounts={boroughCounts}
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

      <div className="mx-auto flex max-w-[1200px]">
        <Sidebar
          activeBorough={activeBorough}
          onBoroughChange={setActiveBorough}
          boroughCounts={boroughCounts}
          neighborhoodCounts={neighborhoodCounts}
          activeNeighborhood={activeNeighborhood}
          onNeighborhoodChange={setActiveNeighborhood}
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
          {/* Date chips */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto hide-scrollbar pb-1">
            <button
              onClick={() => {
                setActiveDate(null);
                setTimeFilter("all");
              }}
              className="shrink-0 rounded-md transition"
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: activeDate === null && timeFilter === "all" ? 700 : 500,
                background: activeDate === null && timeFilter === "all" ? "var(--gold)" : "var(--bg-card)",
                color: activeDate === null && timeFilter === "all" ? "#0a0a0f" : "var(--text-secondary)",
                border: `1px solid ${activeDate === null && timeFilter === "all" ? "var(--gold)" : "var(--border)"}`,
              }}
            >
              All Events
            </button>
            {dateChips.map((chip) => {
              const dateStr = format(chip.date, "yyyy-MM-dd");
              const isActive = activeDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setActiveDate(isActive ? null : dateStr);
                    if (!isActive) setTimeFilter("all");
                    if (isActive) setActiveDate(null);
                  }}
                  className="shrink-0 rounded-md transition"
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? "var(--gold)" : "var(--bg-card)",
                    color: isActive ? "#0a0a0f" : "var(--text-secondary)",
                    border: `1px solid ${isActive ? "var(--gold)" : "var(--border)"}`,
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {isLoading && (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!isLoading && (
            <>
              {isSearching || sortMode !== "date" || activeDate ? (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      isSaved={savedIds.has(e.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              ) : (
                dateGroups.map(([date, evts]) => (
                  <DateGroup
                    key={date}
                    date={date}
                    events={evts}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                  />
                ))
              )}

              {filtered.length === 0 && (
                <div className="py-20 text-center">
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{emptyMessage}</p>
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
      <Footer />
    </>
  );
}
