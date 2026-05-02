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
      className={`group flex items-center gap-3 border-b border-white/[0.04] px-1 py-2.5 transition hover:bg-white/[0.02] ${
        isPast ? "opacity-40" : ""
      }`}
    >
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color, opacity: 0.5 }}
      />
      <span className="w-16 shrink-0 text-[12px] text-[#3f3f46]">
        {format(parseISO(event.date), "MMM d")}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#a1a1aa] group-hover:text-[#fafafa]">
        {event.title}
      </span>
      {event.venue && (
        <span className="hidden truncate text-[12px] text-[#3f3f46] sm:inline sm:max-w-[180px]">
          {event.venue}
        </span>
      )}
      {event.is_free && (
        <span className="shrink-0 text-[11px] font-medium text-emerald-600">
          Free
        </span>
      )}
    </a>
  );
}
