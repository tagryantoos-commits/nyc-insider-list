"use client";

import Link from "next/link";
import CalendarPreview from "./CalendarPreview";

export default function SubscribeCTA({
  subscriberCount = 0,
  onSubscribeClick,
}: {
  subscriberCount?: number;
  onSubscribeClick?: () => void;
}) {
  return (
    <section
      className="text-center"
      style={{
        padding: "56px 24px",
        background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-cta) 100%)",
      }}
    >
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
        Try everything free for 10 days
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          marginTop: 10,
          maxWidth: 440,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Every event unlocked, no credit card required. Then $2.99/month for full access plus 10 auto-syncing Google Calendars.
      </p>

      {subscriberCount > 0 && (
        <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 8, fontWeight: 600 }}>
          Join {subscriberCount}+ subscribers
        </p>
      )}

      {onSubscribeClick ? (
        <button
          onClick={onSubscribeClick}
          className="inline-flex items-center justify-center rounded-md transition hover:opacity-90"
          style={{
            marginTop: 20,
            width: 200,
            height: 44,
            background: "var(--gold)",
            color: "#0a0a0f",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Start free 10-day trial
        </button>
      ) : (
        <Link
          href="/subscribe"
          className="inline-flex items-center justify-center rounded-md transition hover:opacity-90"
          style={{
            marginTop: 20,
            width: 200,
            height: 44,
            background: "var(--gold)",
            color: "#0a0a0f",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Start free 10-day trial
        </Link>
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        No credit card required. Cancel anytime.
      </p>
    </section>
  );
}
