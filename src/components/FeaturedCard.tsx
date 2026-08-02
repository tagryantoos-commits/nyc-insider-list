"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";

/**
 * Full-bleed featured card — Dice's big-photo card reimagined for a dataset
 * without imagery: layered category-color gradients + oversized display type.
 */
export default function FeaturedCard({ event }: { event: Event }) {
  const meta = getCategoryMeta(event.category);
  const dateStr = format(parseISO(event.date), "EEE, MMM d");
  const metaParts = [dateStr];
  if (event.time) metaParts.push(event.time);
  if (event.venue) metaParts.push(event.venue);

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative block overflow-hidden rounded-xl transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        background: `
          radial-gradient(ellipse 420px 240px at 85% 10%, ${meta.color}38 0%, transparent 65%),
          radial-gradient(ellipse 300px 200px at 10% 95%, ${meta.color}20 0%, transparent 60%),
          linear-gradient(160deg, #17171d 0%, #0e0e13 70%)
        `,
        border: `1px solid ${meta.color}30`,
        padding: "26px 24px 22px",
      }}
    >
      {/* Grain for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            ★ Featured
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: meta.color,
            }}
          >
            {event.category}
          </span>
        </div>

        <h3
          className="display mt-3"
          style={{ fontSize: "clamp(26px, 4.5vw, 40px)", color: "#fff" }}
        >
          {event.title}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="truncate" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {metaParts.join(" · ")}
          </p>
          <span
            className="shrink-0"
            style={{ fontSize: 13, fontWeight: 700, color: event.is_free ? "var(--free)" : "var(--gold)" }}
          >
            {event.is_free ? "Free" : event.cost ?? ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
