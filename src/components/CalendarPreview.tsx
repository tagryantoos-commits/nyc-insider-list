import { getCategoryMeta, CATEGORIES } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO, addDays, startOfDay } from "date-fns";

// Build a week of calendar data from real events
function buildWeekData(events: Event[]) {
  const today = startOfDay(new Date());
  const days: { date: Date; label: string; events: Event[] }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayEvents = events
      .filter((e) => e.date === dateStr)
      .slice(0, 3); // max 3 per day for visual
    days.push({
      date: d,
      label: i === 0 ? "Today" : format(d, "EEE"),
      events: dayEvents,
    });
  }
  return days;
}

export default function CalendarPreview({ events }: { events: Event[] }) {
  const weekData = buildWeekData(events);

  return (
    <div className="w-full max-w-[560px] mx-auto">
      {/* Phone frame */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "#1a1a20",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Calendar header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: "var(--gold)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              NYC Insider List
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Google Calendar
          </span>
        </div>

        {/* Week view */}
        <div className="grid grid-cols-7 gap-px" style={{ background: "rgba(255,255,255,0.03)" }}>
          {/* Day headers */}
          {weekData.map((day) => (
            <div
              key={day.label}
              className="text-center py-1.5"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: day.label === "Today" ? "var(--gold)" : "var(--text-muted)",
                background: "#1a1a20",
              }}
            >
              {day.label}
              <div style={{ fontSize: 14, fontWeight: 700, color: day.label === "Today" ? "#fff" : "var(--text-secondary)", marginTop: 2 }}>
                {format(day.date, "d")}
              </div>
            </div>
          ))}

          {/* Event blocks */}
          {weekData.map((day) => (
            <div
              key={`events-${day.label}`}
              className="flex flex-col gap-1 p-1"
              style={{ background: "#141418", minHeight: 80 }}
            >
              {day.events.map((event) => {
                const meta = getCategoryMeta(event.category);
                return (
                  <div
                    key={event.id}
                    className="rounded px-1 py-0.5"
                    style={{
                      background: `${meta.color}20`,
                      borderLeft: `2px solid ${meta.color}`,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 7,
                        fontWeight: 600,
                        color: meta.color,
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {event.title.slice(0, 18)}
                    </p>
                    {event.time && (
                      <p style={{ fontSize: 6, color: "var(--text-muted)", marginTop: 1 }}>
                        {event.time}
                      </p>
                    )}
                  </div>
                );
              })}
              {day.events.length === 0 && (
                <div className="flex-1" />
              )}
            </div>
          ))}
        </div>

        {/* Category legend */}
        <div
          className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {CATEGORIES.filter((c) => c.key !== "Other").slice(0, 6).map((cat) => (
            <div key={cat.key} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
              <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Caption */}
      <p className="text-center mt-3" style={{ fontSize: 11, color: "var(--text-muted)" }}>
        Events auto-sync to your Google Calendar by category
      </p>
    </div>
  );
}
