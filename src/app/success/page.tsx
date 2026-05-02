import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>You&apos;re in</h1>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Your 9 calendars will appear in Google Calendar within 5 minutes.
        </p>

        <div className="mt-6 rounded-lg border p-4 text-left" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="space-y-1.5">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>NYC - {cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-[#111827] px-5 py-2 text-[13px] font-medium text-white dark:bg-white dark:text-[#111827]"
          >
            Open Google Calendar
          </a>
          <div>
            <Link href="/" className="text-[12px]" style={{ color: "var(--text-muted)" }}>Back to events</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
