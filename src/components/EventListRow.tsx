"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Lock } from "lucide-react";
import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";

const CATEGORY_EMOJI: Record<string, string> = {
  Rooftop: "🍹",
  Broadway: "🎭",
  Concert: "🎸",
  Museum: "🏛️",
  Festival: "🎪",
  "Free Event": "🗽",
  "Kid-Friendly": "🎈",
  Comedy: "🎤",
  Sports: "🏟️",
  Film: "🎬",
  Other: "✨",
};

/**
 * Dice-style compact list row: square category tile, title + venue line,
 * save heart. Dense enough to scan ten per screen.
 */
export default function EventListRow({
  event,
  isSaved,
  onToggleSave,
  isGated,
  onGatedClick,
  showDate = false,
}: {
  event: Event;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isGated?: boolean;
  onGatedClick?: () => void;
  showDate?: boolean;
}) {
  const meta = getCategoryMeta(event.category);
  const [pressed, setPressed] = useState(false);

  const isSoldOut = event.title.toLowerCase().includes("sold out");
  const metaParts: string[] = [];
  if (showDate) {
    const [, m, d] = event.date.split("-");
    metaParts.push(`${Number(m)}/${Number(d)}`);
  }
  if (event.time) metaParts.push(event.time);
  if (event.venue) metaParts.push(event.venue);
  else if (event.neighborhood) metaParts.push(event.neighborhood);

  const inner = (
    <div
      className="flex items-center gap-3 py-2.5 group"
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ opacity: isSoldOut ? 0.45 : 1, background: pressed ? "rgba(255,255,255,0.03)" : "transparent" }}
    >
      {/* Category tile — stands in for artwork */}
      <div
        className="flex shrink-0 items-center justify-center rounded-md"
        style={{
          width: 48,
          height: 48,
          fontSize: 20,
          background: `linear-gradient(135deg, ${meta.color}2e 0%, ${meta.color}0a 60%, transparent 100%)`,
          border: `1px solid ${meta.color}33`,
        }}
      >
        {CATEGORY_EMOJI[event.category] ?? "✨"}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="truncate"
            style={{ fontSize: 14.5, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}
          >
            {event.title}
          </p>
          {event.is_free && !isGated && (
            <span
              className="shrink-0 rounded px-1.5 py-px"
              style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", color: "var(--free)", background: "rgba(34,197,94,0.12)" }}
            >
              FREE
            </span>
          )}
          {isSoldOut && (
            <span className="shrink-0" style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>
              SOLD OUT
            </span>
          )}
          {event.is_featured && !isSoldOut && (
            <span
              className="shrink-0 rounded px-1.5 py-px"
              style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", color: "var(--gold)", background: "rgba(240,200,64,0.1)" }}
            >
              PICK
            </span>
          )}
        </div>
        <p
          className="truncate"
          style={{
            fontSize: 12.5,
            color: "var(--text-secondary)",
            marginTop: 2,
            filter: isGated ? "blur(4px)" : "none",
            userSelect: isGated ? "none" : "auto",
          }}
        >
          {metaParts.join(" · ") || event.category}
        </p>
      </div>

      {/* Right side: price / lock + save */}
      <div className="flex shrink-0 items-center gap-2">
        {isGated ? (
          <Lock style={{ width: 14, height: 14, color: "var(--gold)" }} />
        ) : (
          !event.is_free && event.cost && (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
              {event.cost}
            </span>
          )
        )}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(event.id);
            }}
            className="p-2 -m-1 rounded transition hover:bg-[rgba(255,255,255,0.05)]"
            aria-label={isSaved ? "Remove from saved" : "Save event"}
          >
            <Heart
              style={{
                width: 16,
                height: 16,
                color: isSaved ? "#ef4444" : "var(--text-muted)",
                fill: isSaved ? "#ef4444" : "none",
              }}
            />
          </button>
        )}
      </div>
    </div>
  );

  if (isGated) {
    return (
      <button onClick={onGatedClick} className="block w-full text-left cursor-pointer">
        {inner}
      </button>
    );
  }

  return (
    <Link href={`/events/${event.id}`} className="block hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-md -mx-2 px-2">
      {inner}
    </Link>
  );
}
