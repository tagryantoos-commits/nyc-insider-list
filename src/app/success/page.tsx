import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-[#fafafa]">You&apos;re in</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#52525b]">
          Your 9 calendars will appear in Google Calendar within 5 minutes.
          Each category is a separate calendar you can toggle on or off.
        </p>

        <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-left">
          <div className="space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-3 py-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color, opacity: 0.6 }}
                />
                <span className="text-[13px] text-[#71717a]">
                  NYC - {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md border border-white/[0.15] px-6 py-2 text-[14px] font-medium text-[#fafafa] transition hover:bg-white hover:text-[#09090b]"
          >
            Open Google Calendar
          </a>
          <div>
            <Link
              href="/"
              className="text-[13px] text-[#52525b] transition hover:text-[#71717a]"
            >
              Back to events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
