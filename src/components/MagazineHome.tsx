"use client";

import type { Event } from "@/lib/types";
import { HOMEPAGE_SECTIONS, getCategoryMeta } from "@/lib/constants";
import { parseISO, isBefore, isAfter, startOfDay, endOfDay, addDays, format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import ThisWeekList from "./ThisWeekList";
import CategoryCarousel from "./CategoryCarousel";
import HappyHourCarousel from "./HappyHourCarousel";
import SubscribeCTA from "./SubscribeCTA";
import SubscribeModal from "./SubscribeModal";
import TrialBanner from "./TrialBanner";
import Footer from "./Footer";
import { useAccess } from "@/hooks/useAccess";
import { hasFullAccess } from "@/lib/access-tier";

// Determine which events are "Insider Picks" - top featured or high-value events per category
function computeInsiderPicks(events: Event[]): Set<string> {
  const picks = new Set<string>();
  // Featured events are always picks
  events.filter((e) => e.is_featured).forEach((e) => picks.add(e.id));
  // Also pick the first non-free event from each category this week
  const now = startOfDay(new Date());
  const weekEnd = addDays(now, 7);
  const categories = new Set(events.map((e) => e.category));
  for (const cat of categories) {
    const catEvents = events.filter(
      (e) => e.category === cat && !e.is_free && !picks.has(e.id) &&
        !isBefore(parseISO(e.date), now) && !isAfter(parseISO(e.date), weekEnd),
    );
    if (catEvents.length > 0) picks.add(catEvents[0].id);
  }
  return picks;
}

export default function MagazineHome({ events, subscriberCount = 0 }: { events: Event[]; subscriberCount?: number }) {
  const now = startOfDay(new Date());
  const weekEnd = addDays(now, 7);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const access = useAccess();
  const unlocked = hasFullAccess(access.tier);

  const futureEvents = useMemo(
    () => events.filter((e) => !isBefore(parseISO(e.date), now)),
    [events, now],
  );

  const addedThisWeek = useMemo(() => {
    const weekAgo = addDays(now, -7);
    return events.filter((e) => {
      const created = parseISO(e.created_at);
      return !isBefore(created, weekAgo);
    }).length;
  }, [events, now]);

  // Gated events: more than 7 days from now — unless the visitor has a trial or subscription
  const gateDate = addDays(now, 7);
  const gatedIds = useMemo(() => {
    const ids = new Set<string>();
    if (unlocked) return ids;
    futureEvents.forEach((e) => {
      if (isAfter(parseISO(e.date), gateDate)) ids.add(e.id);
    });
    return ids;
  }, [futureEvents, gateDate, unlocked]);

  const gatedCount = gatedIds.size;

  // Insider picks
  const insiderPickIds = useMemo(() => computeInsiderPicks(futureEvents), [futureEvents]);

  // Saved events (localStorage, shared key with the events explorer)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
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

  const thisWeekEvents = useMemo(
    () => futureEvents.filter((e) => !isAfter(parseISO(e.date), weekEnd)),
    [futureEvents, weekEnd],
  );

  const weekendEvents = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    let daysToFri = 5 - dayOfWeek;
    if (daysToFri < 0) daysToFri += 7;
    if (dayOfWeek >= 5 || dayOfWeek === 0) daysToFri = 0;

    const weekendStart = startOfDay(addDays(new Date(), daysToFri));
    const sunEnd = endOfDay(addDays(weekendStart, 2));

    return futureEvents.filter((e) => {
      const d = parseISO(e.date);
      return !isBefore(d, weekendStart) && !isAfter(d, sunEnd);
    }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15);
  }, [futureEvents]);

  const sections = useMemo(() => {
    return HOMEPAGE_SECTIONS.map((section) => {
      let sectionEvents = futureEvents.filter(
        (e) => e.category === section.category,
      );

      if (section.prefix.includes("Week") || section.invertLabel) {
        sectionEvents = sectionEvents.filter((e) => {
          const d = parseISO(e.date);
          return !isAfter(d, weekEnd);
        });
      }

      sectionEvents.sort((a, b) => a.date.localeCompare(b.date));
      return { ...section, events: sectionEvents.slice(0, 15) };
    });
  }, [futureEvents, weekEnd]);

  // Search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return futureEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.venue ?? "").toLowerCase().includes(q) ||
        (e.neighborhood ?? "").toLowerCase().includes(q) ||
        (e.category ?? "").toLowerCase().includes(q),
    ).slice(0, 20);
  }, [futureEvents, searchQuery]);

  return (
    <>
      <Navbar />
      <TrialBanner access={access} onUpgradeClick={() => setShowModal(true)} />
      <Hero
        eventCount={futureEvents.length}
        addedThisWeek={addedThisWeek}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="mx-auto max-w-[1200px] py-8">
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
                const meta = getCategoryMeta(event.category);
                const dateStr = format(parseISO(event.date), "EEE, MMM d");
                const isGated = gatedIds.has(event.id);
                return (
                  <div
                    key={event.id}
                    onClick={() => { if (isGated) setShowModal(true); else if (event.url) window.open(event.url, "_blank"); }}
                    className="block rounded-lg border transition-all duration-150 hover:-translate-y-px cursor-pointer"
                    style={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border)",
                      borderLeftWidth: 2,
                      borderLeftColor: `${meta.color}40`,
                      padding: "14px 16px",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: meta.color }}>
                        {event.category}
                      </span>
                      {!isGated && (event.is_free || event.cost) && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: event.is_free ? "var(--free)" : "var(--gold)" }}>
                          {event.is_free ? "Free" : event.cost}
                        </span>
                      )}
                    </div>
                    <h3 className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 4 }}>
                      {event.title}
                    </h3>
                    <p className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, filter: isGated ? "blur(4px)" : "none" }}>
                      {dateStr}{event.time ? ` \u00B7 ${event.time}` : ""}{event.venue ? ` \u00B7 ${event.venue}` : ""}
                    </p>
                  </div>
                );
              })}
              {filteredSections.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>No events match your search</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Dice-style day-grouped list — the primary browse surface */}
            <div id="this-week" style={{ scrollMarginTop: 70 }}>
              <ThisWeekList
                events={thisWeekEvents}
                gatedIds={gatedIds}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                onGatedClick={() => setShowModal(true)}
              />
            </div>

            <div className="mt-12" />

            {weekendEvents.length > 0 && (
              <div id="weekend" style={{ scrollMarginTop: 70 }}>
                <CategoryCarousel
                  prefix="This"
                  label="WEEKEND"
                  categoryKey=""
                  events={weekendEvents}
                  viewAllHref="/events"
                  gatedIds={gatedIds}
                  insiderPickIds={insiderPickIds}
                  onGatedClick={() => setShowModal(true)}
                />
              </div>
            )}

            {sections.slice(0, 3).map((section) => (
              <CategoryCarousel
                key={section.category}
                prefix={section.prefix}
                label={section.label}
                categoryKey={section.category}
                events={section.events}
                numbered={section.numbered ?? false}
                invertLabel={section.invertLabel ?? false}
                gatedIds={gatedIds}
                insiderPickIds={insiderPickIds}
                onGatedClick={() => setShowModal(true)}
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
                gatedIds={gatedIds}
                insiderPickIds={insiderPickIds}
                onGatedClick={() => setShowModal(true)}
              />
            ))}
          </>
        )}
      </div>

      <SubscribeCTA subscriberCount={subscriberCount} onSubscribeClick={() => setShowModal(true)} />
      <Footer />

      {/* Floating search — thumb-reach on mobile (Dice-style) */}
      <button
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => document.getElementById("hero-search")?.focus(), 450);
        }}
        aria-label="Search events"
        className="sm:hidden fixed z-40 flex items-center justify-center rounded-full transition active:scale-95"
        style={{
          bottom: 20,
          right: 20,
          width: 52,
          height: 52,
          background: "#fff",
          color: "#0a0a0f",
          boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
        }}
      >
        <Search style={{ width: 20, height: 20 }} />
      </button>

      <SubscribeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        events={futureEvents}
        gatedEventCount={gatedCount}
        subscriberCount={subscriberCount}
        onUnlocked={access.refresh}
      />
    </>
  );
}
