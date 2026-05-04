import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function EventCard({ event }: { event: Event }) {
  const meta = getCategoryMeta(event.category);
  const isSoldOut =
    event.title.toLowerCase().includes("sold out") ||
    (event.description ?? "").toLowerCase().includes("sold out");

  let priceLabel = "";
  let priceColor = "var(--text-secondary)";
  let priceWeight = 600;
  if (isSoldOut) {
    priceLabel = "Sold Out";
    priceColor = "var(--text-muted)";
    priceWeight = 400;
  } else if (event.is_free) {
    priceLabel = "Free";
    priceColor = "#059669";
    priceWeight = 600;
  } else if (event.cost) {
    priceLabel = event.cost;
    priceColor = "var(--text-secondary)";
    priceWeight = 600;
  }

  const dateStr = format(parseISO(event.date), "EEE, MMM d");
  const metaParts = [dateStr];
  if (event.time) metaParts.push(event.time);
  if (event.venue) {
    const venueStr = event.neighborhood
      ? `${event.venue}, ${event.neighborhood}`
      : event.venue;
    metaParts.push(venueStr);
  }

  return (
    <a
      href={event.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border transition-all duration-150 hover:-translate-y-px"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        borderLeftWidth: 2,
        borderLeftColor: `${meta.color}59`, // 35% opacity (hex 59)
        opacity: isSoldOut ? 0.55 : 1,
        cursor: "pointer",
        padding: "14px 16px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.borderLeftColor = `${meta.color}59`;
        e.currentTarget.style.background = "var(--bg-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.borderLeftColor = `${meta.color}59`;
        e.currentTarget.style.background = "var(--bg-card)";
      }}
    >
      {/* Line 1: Category + Price */}
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
        {priceLabel && (
          <span style={{ fontSize: 13, fontWeight: priceWeight, color: priceColor }}>
            {priceLabel}
          </span>
        )}
      </div>

      {/* Line 2: Title */}
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

      {/* Line 3: Metadata */}
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
    </a>
  );
}
