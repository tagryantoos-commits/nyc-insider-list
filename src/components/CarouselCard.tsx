import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function CarouselCard({
  event,
  rank,
}: {
  event: Event;
  rank?: number;
}) {
  const meta = getCategoryMeta(event.category);
  const isSoldOut =
    event.title.toLowerCase().includes("sold out") ||
    (event.description ?? "").toLowerCase().includes("sold out");

  let priceLabel = "";
  let priceColor = "var(--gold)";
  if (isSoldOut) {
    priceLabel = "Sold Out";
    priceColor = "var(--text-muted)";
  } else if (event.is_free) {
    priceLabel = "Free";
    priceColor = "var(--free)";
  } else if (event.cost) {
    priceLabel = event.cost;
    priceColor = "var(--gold)";
  }

  const dateStr = format(parseISO(event.date), "EEE, MMM d");
  const timeStr = event.time ? ` \u00B7 ${event.time}` : "";

  return (
    <a
      href={event.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block shrink-0 rounded-lg border transition-all duration-150"
      style={{
        width: 240,
        height: 140,
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        padding: 16,
        cursor: "pointer",
        opacity: isSoldOut ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.background = "var(--bg-card-hover)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 4px 20px ${meta.color}1a`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <span
          className="absolute flex items-center justify-center rounded-full"
          style={{
            top: -6,
            left: -6,
            width: 22,
            height: 22,
            background: "var(--gold)",
            color: "#0a0a0f",
            fontSize: 11,
            fontWeight: 700,
            zIndex: 2,
          }}
        >
          {rank}
        </span>
      )}

      {/* Top row: category + price */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
            color: meta.color,
          }}
        >
          {event.category}
        </span>
        {priceLabel && (
          <span style={{ fontSize: 13, fontWeight: 700, color: priceColor }}>
            {priceLabel}
          </span>
        )}
      </div>

      {/* Title - max 2 lines */}
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#fff",
          lineHeight: 1.35,
          marginTop: 8,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}
      >
        {event.title}
      </h3>

      {/* Bottom: date + venue */}
      <div className="absolute bottom-3 left-4 right-4">
        <p
          className="truncate"
          style={{ fontSize: 12, color: "var(--text-secondary)" }}
        >
          {dateStr}{timeStr}
        </p>
        {event.venue && (
          <p
            className="truncate"
            style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}
          >
            {event.venue}
          </p>
        )}
      </div>
    </a>
  );
}
