import Link from "next/link";

export default function SubscribeCTA() {
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
        Subscribe for $2.99/month. 9 category calendars auto-sync to Google Calendar. Cancel anytime.
      </p>
      <Link
        href="/subscribe"
        className="inline-flex items-center justify-center rounded-md transition hover:opacity-90"
        style={{
          marginTop: 24,
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
      <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
        or browse events for free
      </p>
    </section>
  );
}
