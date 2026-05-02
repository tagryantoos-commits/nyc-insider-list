"use client";

import { useState, useMemo } from "react";
import type { Event, TimeFilter, ViewMode } from "@/lib/types";
import { parseISO, isBefore, startOfDay, isThisWeek, isThisMonth } from "date-fns";
import Hero from "./Hero";
import FilterBar from "./FilterBar";
import EventCard from "./EventCard";
import EventListItem from "./EventListItem";

export default function EventExplorer({ events }: { events: Event[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [freeOnly, setFreeOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = events;
    const now = startOfDay(new Date());

    if (timeFilter === "upcoming") {
      result = result.filter((e) => !isBefore(parseISO(e.date), now));
    } else if (timeFilter === "week") {
      result = result.filter((e) => isThisWeek(parseISO(e.date)));
    } else if (timeFilter === "month") {
      result = result.filter((e) => isThisMonth(parseISO(e.date)));
    }

    if (activeCategory) {
      result = result.filter((e) => e.category === activeCategory);
    }

    if (freeOnly) {
      result = result.filter((e) => e.is_free);
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

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [events, searchQuery, timeFilter, activeCategory, freeOnly]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filtered) {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  return (
    <>
      <Hero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        eventCount={events.length}
      />

      <FilterBar
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        freeOnly={freeOnly}
        onFreeOnlyChange={setFreeOnly}
        categoryCounts={categoryCounts}
        totalCount={filtered.length}
      />

      <section className="mx-auto max-w-6xl px-5 py-6">
        {viewMode === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div>
            {filtered.map((e) => (
              <EventListItem key={e.id} event={e} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[15px] text-[#52525b]">No events found</p>
            <p className="mt-1 text-[13px] text-[#3f3f46]">
              Try adjusting your filters or search
            </p>
          </div>
        )}
      </section>
    </>
  );
}
