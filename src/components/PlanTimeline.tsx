"use client";

import { useState } from "react";
import { Shuffle, Share2, CalendarPlus } from "lucide-react";
import type { PlanBlock } from "@/lib/plan-my-day";

/**
 * Renders a generated day plan as a vertical timeline with shuffle + share.
 * Sharing prefers a persistent /p/{slug} plan (when real events are in the
 * plan) and falls back to the parameterized generator URL.
 */
export default function PlanTimeline({
  blocks,
  weatherSummary,
  weatherNote,
  onShuffle,
  shuffling,
  getShareUrl,
  planTitle,
}: {
  blocks: PlanBlock[];
  weatherSummary: string | null;
  weatherNote: string | null;
  onShuffle: () => void;
  shuffling: boolean;
  getShareUrl: () => string;
  planTitle: string;
}) {
  const [shareState, setShareState] = useState<"idle" | "working" | "copied">("idle");

  async function handleShare() {
    setShareState("working");
    let url = getShareUrl();

    // Persist as a shared plan when we have concrete events
    const eventIds = blocks.map((b) => b.eventId).filter(Boolean) as string[];
    if (eventIds.length > 0) {
      try {
        const res = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: planTitle, eventIds }),
        });
        const data = await res.json();
        if (res.ok && data.url) url = `${window.location.origin}${data.url}`;
      } catch {
        // fall back to generator URL
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: planTitle, url });
        setShareState("idle");
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("idle");
    }
  }

  if (blocks.length === 0) {
    return (
      <div
        className="rounded-xl border text-center mt-8"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)", padding: "32px 20px" }}
      >
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Slow day out there — try a different mood or duration.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {(weatherSummary || weatherNote) && (
        <div
          className="rounded-lg border px-4 py-2.5 mb-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {weatherSummary && <>☁️ {weatherSummary}</>}
            {weatherNote && (
              <span style={{ color: "var(--gold)" }}> · {weatherNote}</span>
            )}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative" style={{ paddingLeft: 24 }}>
        <div
          className="absolute"
          style={{ left: 5, top: 8, bottom: 8, width: 1, background: "var(--border)" }}
        />
        <div className="flex flex-col gap-5">
          {blocks.map((block, i) => (
            <div key={i} className="relative">
              <span
                className="absolute rounded-full"
                style={{
                  left: -24,
                  top: 6,
                  width: 11,
                  height: 11,
                  background: "var(--gold)",
                  border: "2px solid var(--bg)",
                }}
              />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--gold)" }}>
                {block.timeLabel}
              </p>
              <div className="flex items-start justify-between gap-3 mt-1">
                <div className="min-w-0">
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.35 }}>
                    {block.emoji} {block.href ? (
                      <a href={block.href} className="hover:underline" target={block.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                        {block.title}
                      </a>
                    ) : (
                      block.title
                    )}
                    {block.isFree && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--free)", marginLeft: 8 }}>FREE</span>
                    )}
                  </p>
                  {block.subtitle && (
                    <p className="truncate" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}>
                      {block.subtitle}
                    </p>
                  )}
                </div>
                {block.eventId && (
                  <a
                    href={`/api/event-ics/${block.eventId}`}
                    title="Add to calendar"
                    className="shrink-0 p-2 rounded-md border transition hover:opacity-80"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    <CalendarPlus style={{ width: 15, height: 15 }} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-7">
        <button
          onClick={onShuffle}
          disabled={shuffling}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border transition disabled:opacity-40 hover:opacity-80"
          style={{ height: 44, borderColor: "var(--border)", color: "var(--text)", fontSize: 13, fontWeight: 600 }}
        >
          <Shuffle style={{ width: 15, height: 15 }} />
          {shuffling ? "Shuffling..." : "Shuffle picks"}
        </button>
        <button
          onClick={handleShare}
          disabled={shareState === "working"}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md transition disabled:opacity-60 hover:opacity-90"
          style={{ height: 44, background: "var(--gold)", color: "#0a0a0f", fontSize: 13, fontWeight: 700 }}
        >
          <Share2 style={{ width: 15, height: 15 }} />
          {shareState === "copied" ? "Link copied!" : shareState === "working" ? "Creating link..." : "Share this plan"}
        </button>
      </div>
    </div>
  );
}
