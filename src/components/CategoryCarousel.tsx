"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Event } from "@/lib/types";
import CarouselCard from "./CarouselCard";

interface Props {
  prefix: string;
  label: string;
  categoryKey: string;
  events: Event[];
  numbered?: boolean;
  invertLabel?: boolean;
}

export default function CategoryCarousel({
  prefix,
  label,
  categoryKey,
  events,
  numbered = false,
  invertLabel = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [events]);

  function scrollBy(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  if (events.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>
          {invertLabel ? (
            <>
              <span style={{ color: "var(--gold)" }}>{prefix}</span>{" "}
              <span style={{ color: "#fff" }}>{label}</span>
            </>
          ) : (
            <>
              <span style={{ color: "#fff" }}>{prefix} </span>
              <span style={{ color: "var(--gold)" }}>{label}</span>
            </>
          )}
        </h2>
        <a
          href={`/events?category=${encodeURIComponent(categoryKey)}`}
          className="shrink-0 transition-colors hover:opacity-80"
          style={{ fontSize: 13, color: "var(--text-secondary)" }}
        >
          View All &rarr;
        </a>
      </div>

      {/* Carousel wrapper */}
      <div className="group relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-1)}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              width: 36,
              height: 36,
              background: "rgba(20,20,24,0.9)",
              border: "1px solid var(--border-hover)",
              color: "#fff",
              marginLeft: -18,
            }}
          >
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar carousel-scroll px-4 lg:px-0"
        >
          {events.map((event, i) => (
            <CarouselCard
              key={event.id}
              event={event}
              rank={numbered ? i + 1 : undefined}
            />
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy(1)}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              width: 36,
              height: 36,
              background: "rgba(20,20,24,0.9)",
              border: "1px solid var(--border-hover)",
              color: "#fff",
              marginRight: -18,
            }}
          >
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>
    </section>
  );
}
