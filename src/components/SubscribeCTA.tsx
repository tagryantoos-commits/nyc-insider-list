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
        Get every event in your calendar
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
        Subscribe for $2.99/month. 10 category calendars auto-sync to Google Calendar. Cancel anytime.
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
          Subscribe $2.99/mo
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
          Subscribe $2.99/mo
        </Link>
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        7-day free trial. Cancel anytime.
      </p>
    </section>
  );
}
