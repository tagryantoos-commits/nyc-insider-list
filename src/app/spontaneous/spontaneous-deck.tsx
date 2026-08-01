"use client";

import { useEffect, useState } from "react";
import { Dices, Share2, CalendarPlus, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";

export default function SpontaneousDeck() {
  const [queue, setQueue] = useState<Event[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/spontaneous")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setQueue(data.events);
        else setError(data.error || "Something went wrong");
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const event = queue[index % Math.max(queue.length, 1)];

  async function handleShare() {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (loading) {
    return (
      <div className="rounded-xl border mt-8 skeleton-pulse" style={{ height: 220, borderColor: "var(--border)" }} />
    );
  }

  if (error) {
    return <p className="mt-8 text-[13px] text-red-500">{error}</p>;
  }

  if (queue.length === 0) {
    return (
      <div
        className="rounded-xl border text-center mt-8"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", padding: "40px 20px" }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
          Quiet night out there.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
          Nothing spontaneous left in the next few hours — check what&apos;s on this week instead.
        </p>
        <a
          href="/events"
          className="inline-block rounded-md mt-5 px-6 py-2.5 transition hover:opacity-90"
          style={{ background: "var(--gold)", color: "#0a0a0f", fontSize: 13, fontWeight: 700 }}
        >
          Browse all events
        </a>
      </div>
    );
  }

  const meta = getCategoryMeta(event.category);
  const metaParts = [format(parseISO(event.date), "EEE, MMM d")];
  if (event.time) metaParts.push(event.time);
  if (event.venue) metaParts.push(event.venue);
  if (event.neighborhood) metaParts.push(event.neighborhood);

  return (
    <div className="mt-8">
      <div
        className="rounded-xl border"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
          borderTop: `3px solid ${meta.color}`,
          padding: "26px 24px",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: meta.color,
            }}
          >
            {event.category}
          </span>
          {event.is_free ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--free)" }}>Free</span>
          ) : event.cost ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{event.cost}</span>
          ) : null}
        </div>

        <h2 style={{ fontSize: 21, fontWeight: 700, color: "#fff", marginTop: 10, lineHeight: 1.3 }}>
          {event.title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
          {metaParts.join(" · ")}
        </p>
        {event.description && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.55 }}>
            {event.description.slice(0, 200)}
            {event.description.length > 200 ? "…" : ""}
          </p>
        )}

        <div className="flex items-center gap-2 mt-5">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 transition hover:opacity-90"
              style={{ background: "var(--gold)", color: "#0a0a0f", fontSize: 13, fontWeight: 700 }}
            >
              I&apos;m going <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
          )}
          <a
            href={`/api/event-ics/${event.id}`}
            title="Add to calendar"
            className="p-2.5 rounded-md border transition hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <CalendarPlus style={{ width: 16, height: 16 }} />
          </a>
          <button
            onClick={handleShare}
            title="Share"
            className="p-2.5 rounded-md border transition hover:opacity-80 relative"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <Share2 style={{ width: 16, height: 16 }} />
            {copied && (
              <span
                className="absolute -top-7 left-1/2 -translate-x-1/2 rounded px-2 py-0.5 whitespace-nowrap"
                style={{ fontSize: 10, background: "var(--gold)", color: "#0a0a0f", fontWeight: 600 }}
              >
                Copied!
              </span>
            )}
          </button>
        </div>
      </div>

      <button
        onClick={() => setIndex((i) => i + 1)}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-md border transition hover:opacity-80"
        style={{ height: 48, borderColor: "var(--border)", color: "var(--text)", fontSize: 14, fontWeight: 600 }}
      >
        <Dices style={{ width: 17, height: 17 }} />
        Show me another ({queue.length} tonight)
      </button>
    </div>
  );
}
