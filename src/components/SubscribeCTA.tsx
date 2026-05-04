import Link from "next/link";

export default function SubscribeCTA() {
  return (
    <section
      className="text-center"
      style={{ background: "var(--bg-cta)", padding: "48px 24px" }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
        Get these events in your calendar
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          marginTop: 8,
          maxWidth: 420,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Subscribe for $2.99/month. 9 category calendars sync to Google Calendar. Cancel anytime.
      </p>
      <Link
        href="/subscribe"
        className="inline-flex items-center justify-center rounded-md transition hover:opacity-90"
        style={{
          marginTop: 20,
          width: 160,
          height: 40,
          background: "var(--text)",
          color: "var(--bg)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Subscribe
      </Link>
    </section>
  );
}
