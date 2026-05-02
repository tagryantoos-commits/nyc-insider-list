import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function FeaturedEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-6">
      <h2
        className="mb-3 text-[11px] font-medium uppercase"
        style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
      >
        Editor&apos;s Picks
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 3).map((event) => {
          const meta = getCategoryMeta(event.category);
          return (
            <a
              key={event.id}
              href={event.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-lg border transition hover:-translate-y-px"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-hover)";
                e.currentTarget.style.boxShadow = "var(--shadow-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="h-[2px]" style={{ backgroundColor: "#d97706" }} />
              <div className="px-4 py-3.5">
                <span
                  className="text-[11px] font-medium uppercase"
                  style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
                >
                  {event.category}
                </span>
                <h3
                  className="mt-1 text-[15px] font-semibold leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  <span style={{ color: "#d97706" }}>&#9733;</span> {event.title}
                </h3>
                <div
                  className="mt-1.5 flex items-center gap-1 text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>{format(parseISO(event.date), "EEE, MMM d")}</span>
                  {event.time && (
                    <>
                      <span style={{ color: "var(--text-muted)" }}>&middot;</span>
                      <span>{event.time}</span>
                    </>
                  )}
                  {event.venue && (
                    <>
                      <span style={{ color: "var(--text-muted)" }}>&middot;</span>
                      <span>{event.venue}</span>
                    </>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
