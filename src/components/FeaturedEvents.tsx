import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function FeaturedEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginBottom: 12,
        }}
      >
        <span style={{ color: "#d97706" }}>&#9733;</span> Editor&apos;s Picks
      </h2>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 3).map((event) => {
          const meta = getCategoryMeta(event.category);
          const isFree = event.is_free;
          const dateStr = format(parseISO(event.date), "EEE, MMM d");
          const metaParts = [dateStr];
          if (event.time) metaParts.push(event.time);
          if (event.venue) metaParts.push(event.venue);

          return (
            <a
              key={event.id}
              href={event.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-lg border transition-all duration-150 hover:-translate-y-px"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border)",
                borderTopWidth: 2,
                borderTopColor: "#d97706",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-hover)";
                e.currentTarget.style.borderTopColor = "#d97706";
                e.currentTarget.style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.borderTopColor = "#d97706";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              <div style={{ padding: "18px 20px" }}>
                {/* Category + Price */}
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase" as const,
                      color: "var(--text-muted)",
                    }}
                  >
                    {event.category}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isFree ? "#059669" : "var(--text-secondary)",
                    }}
                  >
                    {isFree ? "Free" : event.cost ?? ""}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="truncate"
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: "var(--text)",
                    marginTop: 4,
                  }}
                >
                  {event.title}
                </h3>

                {/* Meta */}
                <p
                  className="truncate"
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  {metaParts.join(" \u00B7 ")}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
