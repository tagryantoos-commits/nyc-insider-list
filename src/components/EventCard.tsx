import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow } from "date-fns";

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  const diff = differenceInCalendarDays(d, new Date());
  if (diff < 0) return "Past";
  if (diff <= 14) return `In ${diff} days`;
  return "";
}

export default function EventCard({ event }: { event: Event }) {
  const meta = getCategoryMeta(event.category);
  const isPast = differenceInCalendarDays(parseISO(event.date), new Date()) < 0;
  const label = dayLabel(event.date);
  const isSoldOut = event.title.toLowerCase().includes("sold out") ||
    (event.description ?? "").toLowerCase().includes("sold out");

  return (
    <a
      href={event.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f1629] transition hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 ${
        isPast ? "opacity-40" : ""
      }`}
    >
      {/* Category left border */}
      <div className="w-1 shrink-0" style={{ backgroundColor: meta.color }} />

      <div className="flex flex-1 flex-col p-4">
        {/* Top row: badges */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
          >
            {meta.emoji} {event.category}
          </span>
          {event.is_free && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Free
            </span>
          )}
          {isSoldOut && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
              Sold Out
            </span>
          )}
          {event.is_featured && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Featured
            </span>
          )}
          {label && !isPast && (
            <span className="ml-auto text-[10px] font-medium text-white/30">
              {label}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug text-white group-hover:text-blue-300 sm:text-base">
          {event.title}
        </h3>

        {/* Description (cards view only — truncated) */}
        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/30">
            {event.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-3 text-xs text-white/40">
          <span>{format(parseISO(event.date), "EEE, MMM d")}</span>
          {event.time && <span>{event.time}</span>}
          {event.venue && <span className="truncate">{event.venue}</span>}
          {event.cost && !event.is_free && <span>{event.cost}</span>}
        </div>
      </div>
    </a>
  );
}
