"use client";

import { useMemo, useState } from "react";
import { addDays, format, isToday, parseISO, startOfDay } from "date-fns";
import type { Event } from "@/lib/types";
import EventListRow from "./EventListRow";
import FeaturedCard from "./FeaturedCard";

/**
 * The Dice-style centerpiece: day-pill strip + grouped event list.
 * "All" shows seven days grouped under date headers; a day pill narrows
 * to that day. Featured events surface as full-bleed cards atop their day.
 */
export default function ThisWeekList({
  events,
  gatedIds,
  savedIds,
  onToggleSave,
  onGatedClick,
}: {
  events: Event[];
  gatedIds: Set<string>;
  savedIds?: Set<string>;
  onToggleSave?: (id: string) => void;
  onGatedClick: () => void;
}) {
  const [activeDay, setActiveDay] = useState<string | null>(null); // null = all week

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      const iso = format(d, "yyyy-MM-dd");
      let pill: string;
      if (i === 0) pill = "Today";
      else if (i === 1) pill = "Tmrw";
      else pill = `${format(d, "EEE")} ${format(d, "d")}`;
      return { iso, pill, header: isToday(d) ? "Today" : format(d, "EEEE, MMMM d") };
    });
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const day of days) map.set(day.iso, []);
    for (const e of events) {
      const bucket = map.get(e.date);
      if (bucket) bucket.push(e);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        // Featured first, then timed events chronologically, untimed last
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return (a.time ?? "zz").localeCompare(b.time ?? "zz");
      });
    }
    return map;
  }, [events, days]);

  const visibleDays = activeDay ? days.filter((d) => d.iso === activeDay) : days;

  return (
    <section className="px-4 lg:px-0">
      {/* Heading */}
      <h2 className="display" style={{ fontSize: "clamp(32px, 6vw, 52px)", color: "#fff" }}>
        This Week
      </h2>
      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
        Everything happening in the next 7 days
      </p>

      {/* Day pills */}
      <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1 sticky top-[52px] z-30 -mx-4 px-4 lg:mx-0 lg:px-0 py-2"
        style={{ background: "var(--bg)" }}
      >
        <button
          onClick={() => setActiveDay(null)}
          className="shrink-0 rounded-full px-4 transition"
          style={{
            height: 36,
            fontSize: 13,
            fontWeight: 600,
            background: activeDay === null ? "#fff" : "transparent",
            color: activeDay === null ? "#0a0a0f" : "var(--text-secondary)",
            border: activeDay === null ? "1px solid #fff" : "1px solid var(--border)",
          }}
        >
          All
        </button>
        {days.map((day) => {
          const active = activeDay === day.iso;
          const count = byDay.get(day.iso)?.length ?? 0;
          return (
            <button
              key={day.iso}
              onClick={() => setActiveDay(active ? null : day.iso)}
              className="shrink-0 rounded-full px-4 transition"
              disabled={count === 0}
              style={{
                height: 36,
                fontSize: 13,
                fontWeight: 600,
                background: active ? "#fff" : "transparent",
                color: active ? "#0a0a0f" : count === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                border: active ? "1px solid #fff" : "1px solid var(--border)",
                opacity: count === 0 ? 0.4 : 1,
              }}
            >
              {day.pill}
            </button>
          );
        })}
      </div>

      {/* Grouped list */}
      <div className="mt-2">
        {visibleDays.map((day) => {
          const dayEvents = byDay.get(day.iso) ?? [];
          const featured = dayEvents.filter((e) => e.is_featured && !gatedIds.has(e.id)).slice(0, 1);
          const rest = dayEvents.filter((e) => !featured.includes(e));
          const shown = activeDay ? rest : rest.slice(0, 8);
          return (
            <div key={day.iso} className="mt-6 first:mt-2">
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {day.header}
              </h3>
              {dayEvents.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "14px 0" }}>
                  Nothing on the list this day — yet.
                </p>
              ) : (
                <>
                  {featured.map((event) => (
                    <div key={event.id} className="mt-3">
                      <FeaturedCard event={event} />
                    </div>
                  ))}
                  <div className="mt-1" style={{ borderColor: "var(--border)" }}>
                    {shown.map((event) => (
                      <EventListRow
                        key={event.id}
                        event={event}
                        isGated={gatedIds.has(event.id)}
                        onGatedClick={onGatedClick}
                        isSaved={savedIds?.has(event.id)}
                        onToggleSave={onToggleSave}
                      />
                    ))}
                  </div>
                  {!activeDay && rest.length > 8 && (
                    <button
                      onClick={() => setActiveDay(day.iso)}
                      className="mt-1 transition hover:opacity-80"
                      style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gold)" }}
                    >
                      + {rest.length - 8} more on {day.pill === "Today" ? "today" : day.header.split(",")[0]}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
