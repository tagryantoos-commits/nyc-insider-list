import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";
import EventCard from "./EventCard";

export default function DateGroup({
  date,
  events,
}: {
  date: string;
  events: Event[];
}) {
  const formatted = format(parseISO(date), "EEEE, MMMM d");

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Sticky date header */}
      <div
        className="sticky z-30 flex items-center gap-3"
        style={{
          top: 56,
          background: "var(--bg)",
          paddingTop: 4,
          paddingBottom: 10,
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        <span
          className="shrink-0"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          {formatted}
        </span>
        <span
          className="flex-1 border-b border-dotted"
          style={{ borderColor: "var(--border)" }}
        />
        <span
          className="shrink-0"
          style={{ fontSize: 12, color: "var(--text-muted)" }}
        >
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
