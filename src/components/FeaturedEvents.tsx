import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function FeaturedEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-8">
      <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.1em] text-[#52525b]">
        Editor&apos;s Picks
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 3).map((event) => {
          const meta = getCategoryMeta(event.category);
          return (
            <a
              key={event.id}
              href={event.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.12]"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#52525b]">
                {event.category}
              </p>
              <h3 className="mt-2 text-[18px] font-semibold leading-snug text-[#fafafa] group-hover:text-white">
                {event.title}
              </h3>
              {event.description && (
                <p className="mt-2 line-clamp-1 text-[13px] leading-relaxed text-[#52525b]">
                  {event.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-1.5 text-[12px] text-[#3f3f46]">
                <span>{format(parseISO(event.date), "MMM d")}</span>
                {event.time && (
                  <>
                    <span>&middot;</span>
                    <span>{event.time}</span>
                  </>
                )}
                {event.venue && (
                  <>
                    <span>&middot;</span>
                    <span>{event.venue}</span>
                  </>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
