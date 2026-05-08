"use client";

import type { Event } from "@/lib/types";
import { HOMEPAGE_SECTIONS } from "@/lib/constants";
import { parseISO, isBefore, isAfter, startOfDay, endOfDay, addDays, isToday } from "date-fns";
import { useMemo, useState } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import CategoryCarousel from "./CategoryCarousel";
import HappyHourCarousel from "./HappyHourCarousel";
import SubscribeCTA from "./SubscribeCTA";
import Footer from "./Footer";

export default function MagazineHome({ events }: { events: Event[] }) {
  const now = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const weekEnd = addDays(now, 7);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter future events once
  const futureEvents = useMemo(
    () => events.filter((e) => !isBefore(parseISO(e.date), now)),
    [events, now],
  );

  // Events added this week (created_at within last 7 days)
  const addedThisWeek = useMemo(() => {
    const weekAgo = addDays(now, -7);
    return events.filter((e) => {
      const created = parseISO(e.created_at);
      return !isBefore(created, weekAgo);
    }).length;
  }, [events, now]);

  // Tonight's events
  const tonightEvents = useMemo(
    () => futureEvents.filter((e) => {
      const d = parseISO(e.date);
      return isToday(d);
    }).sort((a, b) => a.date.localeCompare(b.date)),
    [futureEvents],
  );

  // This Weekend events (Fri-Sun)
  const weekendEvents = useMemo(() => {
    const fri = new Date();
    const dayOfWeek = fri.getDay();
    // Find next Friday (or today if it's Fri/Sat/Sun)
    let daysToFri = 5 - dayOfWeek;
    if (daysToFri < 0) daysToFri += 7;
    if (dayOfWeek >= 5 || dayOfWeek === 0) daysToFri = 0; // already weekend

    const weekendStart = startOfDay(addDays(new Date(), daysToFri));
    const weekendEnd = endOfDay(addDays(weekendStart, dayOfWeek === 5 ? 2 : dayOfWeek === 6 ? 1 : 0));
    // Actually, simpler: get Fri/Sat/Sun of this or next weekend
    const sunEnd = endOfDay(addDays(weekendStart, 2));

    return futureEvents.filter((e) => {
      const d = parseISO(e.date);
      return !isBefore(d, weekendStart) && !isAfter(d, sunEnd);
    }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15);
  }, [futureEvents]);

  // Build section data
  const sections = useMemo(() => {
    return HOMEPAGE_SECTIONS.map((section) => {
      let sectionEvents = futureEvents.filter(
        (e) => e.category === section.category,
      );

      if (
        section.prefix.includes("Week") ||
        section.invertLabel
      ) {
        sectionEvents = sectionEvents.filter((e) => {
          const d = parseISO(e.date);
          return !isAfter(d, weekEnd);
        });
      }

      sectionEvents.sort((a, b) => a.date.localeCompare(b.date));

      return {
        ...section,
        events: sectionEvents.slice(0, 15),
      };
    });
  }, [futureEvents, weekEnd]);

  // Search filtering
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matched = futureEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.venue ?? "").toLowerCase().includes(q) ||
        (e.neighborhood ?? "").toLowerCase().includes(q) ||
        (e.category ?? "").toLowerCase().includes(q),
    ).slice(0, 20);
    return matched;
  }, [futureEvents, searchQuery]);

  return (
    <>
      <Navbar />
      <Hero
        eventCount={futureEvents.length}
        addedThisWeek={addedThisWeek}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="mx-auto max-w-[1200px] py-8">
        {/* Search results mode */}
        {filteredSections ? (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>
                <span style={{ color: "#fff" }}>Results for </span>
                <span style={{ color: "var(--gold)" }}>&ldquo;{searchQuery}&rdquo;</span>
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {filteredSections.length} found
              </span>
            </div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4 lg:px-0">
              {filteredSections.map((event) => {
                const { getCategoryMeta } = require("@/lib/constants");
                const meta = getCategoryMeta(event.category);
                const { format } = require("date-fns");
                const dateStr = format(parseISO(event.date), "EEE, MMM d");
                const isFree = event.is_free;
                return (
                  <a
                    key={event.id}
                    href={event.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border transition-all duration-150 hover:-translate-y-px"
                    style={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border)",
                      borderLeftWidth: 2,
                      borderLeftColor: `${meta.color}40`,
                      padding: "14px 16px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-hover)";
                      e.currentTarget.style.background = "var(--bg-card-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--bg-card)";
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: meta.color }}>
                        {event.category}
                      </span>
                      {(isFree || event.cost) && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: isFree ? "var(--free)" : "var(--gold)" }}>
                          {isFree ? "Free" : event.cost}
                        </span>
                      )}
                    </div>
                    <h3 className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 4 }}>
                      {event.title}
                    </h3>
                    <p className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                      {dateStr}{event.time ? ` \u00B7 ${event.time}` : ""}{event.venue ? ` \u00B7 ${event.venue}` : ""}
                    </p>
                  </a>
                );
              })}
              {filteredSections.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>No events match your search</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Try a different term or browse the categories below</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Tonight section */}
            {tonightEvents.length > 0 && (
              <CategoryCarousel
                prefix="Happening"
                label="TONIGHT"
                categoryKey=""
                events={tonightEvents.slice(0, 15)}
                invertLabel={false}
                viewAllHref="/events"
              />
            )}

            {/* This Weekend section */}
            {weekendEvents.length > 0 && (
              <CategoryCarousel
                prefix="This"
                label="WEEKEND"
                categoryKey=""
                events={weekendEvents}
                invertLabel={false}
                viewAllHref="/events"
              />
            )}

            {/* Category carousels */}
            {sections.slice(0, 3).map((section) => (
              <CategoryCarousel
                key={section.category}
                prefix={section.prefix}
                label={section.label}
                categoryKey={section.category}
                events={section.events}
                numbered={section.numbered ?? false}
                invertLabel={section.invertLabel ?? false}
              />
            ))}

            <HappyHourCarousel />

            {sections.slice(3).map((section) => (
              <CategoryCarousel
                key={section.category}
                prefix={section.prefix}
                label={section.label}
                categoryKey={section.category}
                events={section.events}
                numbered={section.numbered ?? false}
                invertLabel={section.invertLabel ?? false}
              />
            ))}
          </>
        )}
      </div>

      <SubscribeCTA />
      <Footer />
    </>
  );
}
