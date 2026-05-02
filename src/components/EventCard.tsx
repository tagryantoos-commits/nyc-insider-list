import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

export default function EventCard({ event }: { event: Event }) {
  const meta = getCategoryMeta(event.category);
  const isPast = differenceInCalendarDays(parseISO(event.date), new Date()) < 0;
  const isSoldOut =
    event.title.toLowerCase().includes("sold out") ||
    (event.description ?? "").toLowerCase().includes("sold out");

  return (
    <a
      href={event.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition hover:-translate-y-0.5 hover:border-white/[0.12] ${
        isPast || isSoldOut ? "opacity-50" : ""
      }`}
    >
      {/* Category accent border */}
      <div
        className="w-[2px] shrink-0"
        style={{ backgroundColor: meta.color, opacity: 0.4 }}
      />

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#52525b]">
          {event.category}
        </p>

        <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-[#fafafa]">
          {event.title}
          {isSoldOut && (
            <span className="ml-2 text-[11px] font-medium uppercase text-[#3f3f46]">
              Sold Out
            </span>
          )}
        </h3>

        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#52525b]">
            {event.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-1.5 pt-4 text-[12px] text-[#3f3f46]">
          <span>{format(parseISO(event.date), "EEE, MMM d")}</span>
          {event.time && (
            <>
              <span>&middot;</span>
              <span>{event.time}</span>
            </>
          )}
          {event.venue && (
            <>
              <span>&middot;</span>
              <span className="truncate">{event.venue}</span>
            </>
          )}
          {event.is_free && (
            <>
              <span>&middot;</span>
              <span className="text-emerald-500">Free</span>
            </>
          )}
          {event.cost && !event.is_free && (
            <>
              <span>&middot;</span>
              <span>{event.cost}</span>
            </>
          )}
        </div>
      </div>
    </a>
  );
}
