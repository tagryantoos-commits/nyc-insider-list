import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Star } from "lucide-react";

export default function FeaturedEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
        <Star className="h-4 w-4 text-amber-400" />
        Editor&apos;s Picks
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 3).map((event) => {
          const meta = getCategoryMeta(event.category);
          return (
            <a
              key={event.id}
              href={event.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f1629] transition hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
            >
              <div
                className="h-1"
                style={{
                  background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
                }}
              />
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${meta.color}18`,
                      color: meta.color,
                    }}
                  >
                    {meta.emoji} {event.category}
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Featured
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-snug text-white group-hover:text-blue-300">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/40">
                    {event.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                  <span>{format(parseISO(event.date), "EEE, MMM d")}</span>
                  {event.time && <span>{event.time}</span>}
                  {event.venue && <span>{event.venue}</span>}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
