"use client";

import { useState, useMemo } from "react";
import type { Event } from "@/lib/types";
import { parseISO, isBefore, startOfDay } from "date-fns";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileFilters from "./MobileFilters";
import FeaturedEvents from "./FeaturedEvents";
import DateGroup from "./DateGroup";
import EventCard from "./EventCard";
import SubscribeCTA from "./SubscribeCTA";

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

  const filtered = useMemo(() => {
    const now = startOfDay(new Date());
    let result = events.filter((e) => !isBefore(parseISO(e.date), now));

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

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [events, searchQuery, activeCategory, freeOnly, hideSoldOut]);

  // Category counts (from filtered-minus-category so counts update correctly)
  const categoryCounts = useMemo(() => {
    const now = startOfDay(new Date());
    let base = events.filter((e) => !isBefore(parseISO(e.date), now));
    if (freeOnly) base = base.filter((e) => e.is_free);
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
  }, [events, freeOnly, searchQuery]);

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
  const showFeatured = !activeCategory && !isSearching && featured.length > 0;

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
      />

      <div className="mx-auto flex max-w-[1200px]">
        <Sidebar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          categoryCounts={categoryCounts}
          totalCount={totalCount}
          freeOnly={freeOnly}
          onFreeOnlyChange={setFreeOnly}
          hideSoldOut={hideSoldOut}
          onHideSoldOutChange={setHideSoldOut}
        />

        <main className="flex-1 min-w-0 px-4 py-5 lg:px-6">
          {showFeatured && <FeaturedEvents events={featured} />}

          {isSearching ? (
            /* Flat grid when searching */
            <div className="grid gap-2 sm:grid-cols-2">
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
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>No events found</p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
                Try adjusting your filters or search
              </p>
            </div>
          )}
        </main>
      </div>

      <SubscribeCTA />
      <footer
        className="border-t py-5 text-center text-[11px]"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        &copy; {new Date().getFullYear()} NYC Insider List
      </footer>
    </>
  );
}
