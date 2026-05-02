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
    <div className="mb-6">
      {/* Sticky date header */}
      <div
        className="sticky z-30 flex items-center gap-3 pb-2.5 pt-1"
        style={{ top: "49px", background: "var(--bg)" }}
      >
        <span className="shrink-0 text-[13px] font-semibold" style={{ color: "var(--text)" }}>
          {formatted}
        </span>
        <span
          className="flex-1 border-b border-dotted"
          style={{ borderColor: "var(--border)" }}
        />
        <span className="shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
