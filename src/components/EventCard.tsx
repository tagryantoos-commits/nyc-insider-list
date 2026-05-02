import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function EventCard({ event }: { event: Event }) {
  const meta = getCategoryMeta(event.category);
  const isSoldOut =
    event.title.toLowerCase().includes("sold out") ||
    (event.description ?? "").toLowerCase().includes("sold out");

  let priceLabel = "";
  let priceColor = "var(--text-muted)";
  if (isSoldOut) {
    priceLabel = "Sold Out";
    priceColor = "var(--text-muted)";
  } else if (event.is_free) {
    priceLabel = "Free";
    priceColor = "#10b981";
  } else if (event.cost) {
    priceLabel = event.cost;
    priceColor = meta.color;
  }

  return (
    <a
      href={event.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex overflow-hidden rounded-lg border transition hover:-translate-y-px"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        opacity: isSoldOut ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.boxShadow = "var(--shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="w-[2px] shrink-0" style={{ backgroundColor: meta.color }} />
      <div className="flex-1 px-4 py-3.5">
        {/* Row 1: Category + Price */}
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-medium uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
          >
            {event.category}
          </span>
          {priceLabel && (
            <span className="text-[11px] font-medium" style={{ color: priceColor }}>
              {priceLabel}
            </span>
          )}
        </div>

        {/* Row 2: Title */}
        <h3
          className="mt-1 truncate text-[14px] font-semibold leading-snug"
          style={{ color: "var(--text)" }}
        >
          {event.title}
        </h3>

        {/* Row 3: Date/Time/Venue */}
        <div className="mt-1 flex items-center gap-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
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
              <span className="truncate">{event.venue}</span>
            </>
          )}
        </div>
      </div>
    </a>
  );
}
