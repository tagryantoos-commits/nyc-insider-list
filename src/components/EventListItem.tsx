import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

export default function EventListItem({ event }: { event: Event }) {
  const meta = getCategoryMeta(event.category);
  const isPast = differenceInCalendarDays(parseISO(event.date), new Date()) < 0;

  return (
    <a
      href={event.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 border-b border-white/[0.04] px-2 py-2.5 transition hover:bg-white/[0.02] ${
        isPast ? "opacity-40" : ""
      }`}
    >
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      <span className="w-20 shrink-0 text-xs text-white/40">
        {format(parseISO(event.date), "MMM d")}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/80 group-hover:text-blue-300">
        {event.title}
      </span>
      {event.venue && (
        <span className="hidden truncate text-xs text-white/30 sm:inline sm:max-w-[200px]">
          {event.venue}
        </span>
      )}
      {event.is_free && (
        <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-400">
          Free
        </span>
      )}
    </a>
  );
}
