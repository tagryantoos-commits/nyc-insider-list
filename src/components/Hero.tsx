"use client";

import Link from "next/link";
import { Search } from "lucide-react";

const QUICK_LINKS = [
  { label: "Tonight", href: "#this-week", emoji: "🌃" },
  { label: "This weekend", href: "#weekend", emoji: "🎉" },
  { label: "Free this week", href: "/events?free=1", emoji: "🗽" },
  { label: "Drinks first?", href: "/happy-hours", emoji: "🍸" },
];

export default function Hero({
  eventCount,
  addedThisWeek,
  searchQuery,
  onSearchChange,
}: {
  eventCount: number;
  addedThisWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 480px 200px at 15% 100%, rgba(240,200,64,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 380px 180px at 85% 90%, rgba(77,159,255,0.06) 0%, transparent 70%),
          linear-gradient(180deg, #101018 0%, #0a0a0f 100%)
        `,
      }}
    >
      {/* City light dots along the base */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 92%, rgba(255,220,100,0.6), transparent),
            radial-gradient(1px 1px at 22% 95%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 35% 90%, rgba(255,220,100,0.5), transparent),
            radial-gradient(1px 1px at 55% 94%, rgba(255,220,100,0.4), transparent),
            radial-gradient(1px 1px at 70% 91%, rgba(255,220,100,0.5), transparent),
            radial-gradient(1px 1px at 85% 93%, rgba(255,255,255,0.4), transparent)
          `,
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 pt-12 pb-9 lg:pt-16">
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--gold)",
            textTransform: "uppercase",
          }}
        >
          {eventCount.toLocaleString()} events on the list
          {addedThisWeek > 0 && <> · {addedThisWeek} added this week</>}
        </p>

        <h1
          className="display mt-3"
          style={{ fontSize: "clamp(44px, 9vw, 92px)", color: "#fff", maxWidth: 900 }}
        >
          What&apos;s the move{" "}
          <span style={{ color: "var(--gold)" }}>tonight?</span>
        </h1>

        {/* Search */}
        <div className="relative mt-7 max-w-[520px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)", width: 16, height: 16 }}
          />
          <input
            id="hero-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, venues, neighborhoods..."
            className="w-full rounded-full border outline-none transition focus:border-[rgba(255,255,255,0.2)]"
            style={{
              height: 46,
              paddingLeft: 44,
              paddingRight: 18,
              fontSize: 14,
              background: "var(--bg-input)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {/* The four questions people actually have */}
        <div className="mt-5 flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 transition hover:border-[rgba(255,255,255,0.25)]"
                style={{ height: 40, fontSize: 13, fontWeight: 600, borderColor: "var(--border)", color: "var(--text)" }}
              >
                {link.emoji} {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 transition hover:border-[rgba(255,255,255,0.25)]"
                style={{ height: 40, fontSize: 13, fontWeight: 600, borderColor: "var(--border)", color: "var(--text)" }}
              >
                {link.emoji} {link.label}
              </Link>
            ),
          )}
          <Link
            href="/plan-my-day"
            className="inline-flex items-center gap-1.5 rounded-full px-4 transition hover:opacity-90"
            style={{ height: 40, fontSize: 13, fontWeight: 700, background: "var(--gold)", color: "#0a0a0f" }}
          >
            ✨ Plan my day
          </Link>
          <Link
            href="/spontaneous"
            className="inline-flex items-center gap-1.5 rounded-full border px-4 transition hover:border-[rgba(240,200,64,0.5)]"
            style={{ height: 40, fontSize: 13, fontWeight: 600, borderColor: "rgba(240,200,64,0.35)", color: "var(--gold)" }}
          >
            🎲 I&apos;m feeling spontaneous
          </Link>
        </div>
      </div>
    </section>
  );
}
