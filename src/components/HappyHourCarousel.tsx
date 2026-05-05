"use client";

import { useEffect, useState } from "react";
import type { HappyHour } from "@/lib/types";
import { getVibeMeta } from "@/lib/types";
import Link from "next/link";

export default function HappyHourCarousel() {
  const [venues, setVenues] = useState<HappyHour[]>([]);

  useEffect(() => {
    fetch("/api/happy-hours?sort=quality&limit=8")
      .then((r) => r.json())
      .then((d) => setVenues(d.data ?? []))
      .catch(() => {});
  }, []);

  if (venues.length === 0) return null;

  return (
    <section style={{ marginBottom: 40, paddingLeft: 16, paddingRight: 16 }}>
      {/* Section header */}
      <div className="flex items-baseline gap-3 mb-3 px-1">
        <span style={{ fontSize: 14, fontWeight: 300, color: "var(--text-secondary)" }}>
          Featured
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          HAPPY HOURS
        </span>
        <span className="flex-1" />
        <Link href="/happy-hours" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          See all &rarr;
        </Link>
      </div>

      {/* Carousel */}
      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar carousel-scroll pb-1">
        {venues.map((venue) => {
          const vibe = getVibeMeta(venue.vibe ?? "pub");
          const hasDeal = venue.food_specials || venue.drink_specials;
          let dealLine = "";
          if (venue.food_specials) {
            dealLine = venue.food_specials.split(";")[0].trim();
          } else if (venue.drink_specials) {
            dealLine = venue.drink_specials.split(";")[0].trim();
          } else if (venue.cuisine_type) {
            dealLine = venue.cuisine_type;
          }
          if (dealLine.length > 50) dealLine = dealLine.slice(0, 47) + "...";

          let timeStr = "";
          if (venue.start_time && venue.end_time) {
            timeStr = `${venue.start_time} - ${venue.end_time}`;
          }

          return (
            <a
              key={venue.id}
              href={venue.website_url ?? venue.google_maps_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group shrink-0 block rounded-lg border transition-all duration-150 hover:-translate-y-px"
              style={{
                width: 240,
                background: "var(--bg-card)",
                borderColor: "var(--border)",
                padding: "16px 18px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-hover)";
                e.currentTarget.style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              {/* Vibe + Price */}
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: vibe.color }}>
                  {vibe.label}
                </span>
                {venue.price_tier && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
                    {venue.price_tier}
                  </span>
                )}
              </div>

              {/* Name */}
              <h3 className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginTop: 8 }}>
                {venue.name}
              </h3>

              {/* Deal */}
              {dealLine && (
                <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: hasDeal ? "var(--gold)" : "var(--text-muted)", marginTop: 4 }}>
                  {dealLine}
                </p>
              )}

              {/* Location + Time */}
              <p className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
                {venue.neighborhood ?? venue.borough}
                {timeStr && ` \u00B7 ${timeStr}`}
              </p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
