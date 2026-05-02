import Link from "next/link";
import { CATEGORIES, PRICE_MONTHLY } from "@/lib/constants";
import { Calendar } from "lucide-react";

export default function SubscribeCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-blue-950/30 to-transparent p-8 sm:p-12">
        <Calendar className="mx-auto mb-4 h-10 w-10 text-blue-400" />
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold sm:text-3xl">
          Add to your calendar
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/40">
          Subscribe for {PRICE_MONTHLY}/mo to get all events synced to your
          Google Calendar. Toggle categories on and off. Cancel anytime.
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-2 sm:grid-cols-5">
          {CATEGORIES.filter((c) => c.key !== "Other").map((cat) => (
            <div
              key={cat.key}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center transition hover:bg-white/[0.05]"
            >
              <span className="text-lg">{cat.emoji}</span>
              <p className="mt-1 text-[10px] font-medium text-white/50">
                {cat.label}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/subscribe"
          className="mt-8 inline-block rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold transition hover:bg-blue-500"
        >
          Subscribe to all 9 calendars &mdash; {PRICE_MONTHLY}/mo
        </Link>
      </div>
    </section>
  );
}
