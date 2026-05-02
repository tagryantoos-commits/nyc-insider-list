import Link from "next/link";
import { CATEGORIES, SITE_NAME } from "@/lib/constants";
import { CheckCircle, Calendar, ExternalLink } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-bold">
          You&apos;re in!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/40">
          Your 9 NYC event calendars will appear in your Google Calendar within
          5 minutes. Each category is a separate calendar you can toggle on/off.
        </p>

        <div className="mt-8 rounded-xl border border-white/[0.06] bg-[#0f1629] p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
            Your calendars
          </h3>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-white/70">NYC - {cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
          >
            <Calendar className="h-4 w-4" />
            Open Google Calendar
            <ExternalLink className="h-3 w-3" />
          </a>

          <div>
            <Link
              href="/"
              className="text-sm text-white/40 transition hover:text-white/60"
            >
              Back to events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
