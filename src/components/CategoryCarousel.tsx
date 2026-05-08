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
  viewAllHref?: string;
}

export default function CategoryCarousel({
  prefix,
  label,
  categoryKey,
  events,
  numbered = false,
  invertLabel = false,
  viewAllHref,
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
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [events]);

  function scrollByAmount(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  if (events.length === 0) return null;

  const href = viewAllHref ?? `/events?category=${encodeURIComponent(categoryKey)}`;

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
          href={href}
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
            onClick={() => scrollByAmount(-1)}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center rounded-full transition-opacity"
            style={{
              width: 36,
              height: 36,
              background: "rgba(20,20,24,0.9)",
              border: "1px solid var(--border-hover)",
              color: "#fff",
              marginLeft: -4,
              opacity: 0.7,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
          >
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>
        )}

        {/* Left fade gradient */}
        {canScrollLeft && (
          <div
            className="hidden lg:block absolute left-0 top-0 bottom-0 z-[5] pointer-events-none"
            style={{
              width: 40,
              background: "linear-gradient(90deg, var(--bg) 0%, transparent 100%)",
            }}
          />
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

        {/* Right fade gradient */}
        {canScrollRight && (
          <div
            className="hidden lg:block absolute right-0 top-0 bottom-0 z-[5] pointer-events-none"
            style={{
              width: 60,
              background: "linear-gradient(270deg, var(--bg) 0%, transparent 100%)",
            }}
          />
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollByAmount(1)}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center rounded-full transition-opacity"
            style={{
              width: 36,
              height: 36,
              background: "rgba(20,20,24,0.9)",
              border: "1px solid var(--border-hover)",
              color: "#fff",
              marginRight: -4,
              opacity: 0.7,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
          >
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        )}
      </div>
    </section>
  );
}
