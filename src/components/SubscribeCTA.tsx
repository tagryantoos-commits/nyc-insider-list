import Link from "next/link";

export default function SubscribeCTA() {
  return (
    <section className="py-14 px-6 text-center" style={{ background: "var(--bg-cta)" }}>
      <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
        Get these events in your calendar
      </h2>
      <p className="mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
        Subscribe for $2.99/month. 9 category calendars sync to Google Calendar. Cancel anytime.
      </p>
      <Link
        href="/subscribe"
        className="mt-5 inline-block rounded-md bg-[#111827] px-6 py-2.5 text-[13px] font-medium text-white dark:bg-white dark:text-[#111827]"
      >
        Subscribe
      </Link>
    </section>
  );
}
