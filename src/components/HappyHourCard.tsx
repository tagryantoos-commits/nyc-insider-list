"use client";

import type { HappyHour } from "@/lib/types";
import { getVibeMeta } from "@/lib/types";

export default function HappyHourCard({
  venue,
  accentOverride,
}: {
  venue: HappyHour;
  accentOverride?: string;
}) {
  const vibe = getVibeMeta(venue.vibe ?? "pub");
  const borderColor = accentOverride ?? vibe.color;

  // Format days + times
  let timeStr = "";
  if (venue.days && venue.days.length > 0 && venue.days.length < 7) {
    const days = venue.days.map((d) => d.slice(0, 3)).join(", ");
    timeStr = days;
  }
  if (venue.start_time && venue.end_time) {
    const t = `${venue.start_time} - ${venue.end_time}`;
    timeStr = timeStr ? `${timeStr} \u00B7 ${t}` : t;
  } else if (venue.start_time) {
    timeStr = timeStr ? `${timeStr} \u00B7 ${venue.start_time}` : venue.start_time;
  }

  // Pick the deal line (food > drink > cuisine)
  let dealLine = "";
  if (venue.food_specials) {
    dealLine = venue.food_specials.split(";")[0].trim();
  } else if (venue.drink_specials) {
    dealLine = venue.drink_specials.split(";")[0].trim();
  } else if (venue.cuisine_type) {
    dealLine = venue.cuisine_type;
  }
  if (dealLine.length > 60) dealLine = dealLine.slice(0, 57) + "...";

  const hasDeal = venue.food_specials || venue.drink_specials;

  return (
    <a
      href={venue.website_url ?? venue.google_maps_url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border transition-all duration-150 hover:-translate-y-px"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        borderLeftWidth: 2,
        borderLeftColor: `${borderColor}59`,
        padding: "14px 16px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.borderLeftColor = `${borderColor}59`;
        e.currentTarget.style.background = "var(--bg-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.borderLeftColor = `${borderColor}59`;
        e.currentTarget.style.background = "var(--bg-card)";
      }}
    >
      {/* Line 1: Vibe + Times */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
            color: vibe.color,
          }}
        >
          {vibe.label}
        </span>
        {timeStr && (
          <span
            className="truncate ml-2"
            style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: "55%" }}
          >
            {timeStr}
          </span>
        )}
      </div>

      {/* Line 2: Name */}
      <h3
        className="truncate"
        style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginTop: 4 }}
      >
        {venue.name}
      </h3>

      {/* Line 3: Deal (gold) or cuisine (muted) */}
      {dealLine && (
        <p
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: hasDeal ? "var(--gold)" : "var(--text-muted)",
            marginTop: 3,
          }}
        >
          {dealLine}
        </p>
      )}

      {/* Line 4: Location + Price */}
      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
        <span className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {[venue.neighborhood, venue.borough].filter(Boolean).join(", ")}
        </span>
        {venue.price_tier && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
            {venue.price_tier}
          </span>
        )}
      </div>

      {/* Feature badges */}
      {(venue.has_food_specials || venue.has_live_music || venue.has_outdoor_seating) && (
        <div className="flex gap-3 mt-2">
          {venue.has_food_specials && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Food deals</span>
          )}
          {venue.has_live_music && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Live music</span>
          )}
          {venue.has_outdoor_seating && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Outdoor</span>
          )}
        </div>
      )}
    </a>
  );
}
