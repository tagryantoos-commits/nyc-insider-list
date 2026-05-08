"use client";

import { useState } from "react";
import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO, isToday } from "date-fns";
import { Heart, Share2, ExternalLink } from "lucide-react";

function isHappeningNow(event: Event): boolean {
  if (!isToday(parseISO(event.date))) return false;
  if (!event.time) return true; // If no time specified but it's today, show as live
  // Parse time like "7:00 PM" or "11:05 PM"
  const now = new Date();
  const hours = now.getHours();
  const match = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return false;
  let eventHour = parseInt(match[1]);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && eventHour !== 12) eventHour += 12;
  if (meridian === "AM" && eventHour === 12) eventHour = 0;
  // Consider event "happening now" if current hour >= event hour and within 3 hours
  return hours >= eventHour && hours < eventHour + 3;
}

export default function EventCard({
  event,
  isSaved,
  onToggleSave,
}: {
  event: Event;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const meta = getCategoryMeta(event.category);
  const isSoldOut =
    event.title.toLowerCase().includes("sold out") ||
    (event.description ?? "").toLowerCase().includes("sold out");
  const live = isHappeningNow(event);

  let priceLabel = "";
  let priceColor = "var(--gold)";
  let priceWeight = 700;
  if (isSoldOut) {
    priceLabel = "Sold Out";
    priceColor = "var(--text-muted)";
    priceWeight = 400;
  } else if (event.is_free) {
    priceLabel = "Free";
    priceColor = "var(--free)";
    priceWeight = 700;
  } else if (event.cost) {
    priceLabel = event.cost;
    priceColor = "var(--gold)";
    priceWeight = 700;
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

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (event.url) {
      navigator.clipboard.writeText(event.url).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 1500);
      });
    }
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleSave?.(event.id);
  }

  return (
    <div
      className="group rounded-lg border transition-all duration-150 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "var(--bg-card)",
        borderColor: expanded ? "var(--border-hover)" : "var(--border)",
        borderLeftWidth: 2,
        borderLeftColor: `${meta.color}40`,
        opacity: isSoldOut ? 0.5 : 1,
        padding: "14px 16px",
      }}
      onMouseEnter={(e) => {
        if (!expanded) {
          e.currentTarget.style.borderColor = "var(--border-hover)";
          e.currentTarget.style.background = "var(--bg-card-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!expanded) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--bg-card)";
        }
      }}
    >
      {/* Line 1: Category + Live + Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          {live && (
            <span className="flex items-center gap-1" style={{ fontSize: 10, fontWeight: 600, color: "#ef4444" }}>
              <span className="live-dot" style={{
                width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
                display: "inline-block",
                animation: "live-pulse 1.5s ease-in-out infinite",
              }} />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Share + Save buttons - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onToggleSave && (
              <button
                onClick={handleSave}
                className="p-1 rounded transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                title={isSaved ? "Remove from saved" : "Save event"}
              >
                <Heart
                  style={{
                    width: 14, height: 14,
                    color: isSaved ? "#ef4444" : "var(--text-muted)",
                    fill: isSaved ? "#ef4444" : "none",
                  }}
                />
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-1 rounded transition-colors hover:bg-[rgba(255,255,255,0.05)] relative"
              title="Copy link"
            >
              <Share2 style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
              {showCopied && (
                <span
                  className="absolute -top-6 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 whitespace-nowrap"
                  style={{ fontSize: 10, background: "var(--gold)", color: "#0a0a0f", fontWeight: 600 }}
                >
                  Copied!
                </span>
              )}
            </button>
          </div>
          {priceLabel && (
            <span style={{ fontSize: 13, fontWeight: priceWeight, color: priceColor }}>
              {priceLabel}
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Title */}
      <h3
        className={expanded ? "" : "truncate"}
        style={{
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.3,
          color: "#fff",
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
          color: "var(--text-secondary)",
          marginTop: 4,
        }}
      >
        {metaParts.join(" \u00B7 ")}
      </p>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {event.description && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
              {event.description.slice(0, 300)}{event.description.length > 300 ? "..." : ""}
            </p>
          )}
          {event.address && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {event.address}
            </p>
          )}
          {event.borough && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              {event.borough}
            </p>
          )}
          <div className="flex items-center gap-2">
            <a
              href={`/events/${event.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-md transition hover:opacity-80"
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--gold)",
                color: "#0a0a0f",
              }}
            >
              View Details
            </a>
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md border transition hover:opacity-80"
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Tickets <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
