"use client";

import type { Event } from "@/lib/types";
import { HOMEPAGE_SECTIONS } from "@/lib/constants";
import { parseISO, isBefore, isAfter, startOfDay, addDays } from "date-fns";
import { useMemo } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import CategoryCarousel from "./CategoryCarousel";
import HappyHourCarousel from "./HappyHourCarousel";
import SubscribeCTA from "./SubscribeCTA";

export default function MagazineHome({ events }: { events: Event[] }) {
  const now = startOfDay(new Date());
  const weekEnd = addDays(now, 7);

  // Filter future events once
  const futureEvents = useMemo(
    () => events.filter((e) => !isBefore(parseISO(e.date), now)),
    [events, now],
  );

  // Build section data
  const sections = useMemo(() => {
    return HOMEPAGE_SECTIONS.map((section) => {
      let sectionEvents = futureEvents.filter(
        (e) => e.category === section.category,
      );

      // For "This Week's" or "FREE This Week" sections, filter to this week
      if (
        section.prefix.includes("Week") ||
        section.invertLabel
      ) {
        sectionEvents = sectionEvents.filter((e) => {
          const d = parseISO(e.date);
          return !isAfter(d, weekEnd);
        });
      }

      // Sort by date
      sectionEvents.sort((a, b) => a.date.localeCompare(b.date));

      // Cap at 15 for display
      return {
        ...section,
        events: sectionEvents.slice(0, 15),
      };
    });
  }, [futureEvents, weekEnd]);

  return (
    <>
      <Navbar />
      <Hero eventCount={futureEvents.length} />

      <div className="mx-auto max-w-[1200px] py-8">
        {sections.slice(0, 3).map((section) => (
          <CategoryCarousel
            key={section.category}
            prefix={section.prefix}
            label={section.label}
            categoryKey={section.category}
            events={section.events}
            numbered={section.numbered ?? false}
            invertLabel={section.invertLabel ?? false}
          />
        ))}

        {/* Happy Hours carousel between event sections */}
        <HappyHourCarousel />

        {sections.slice(3).map((section) => (
          <CategoryCarousel
            key={section.category}
            prefix={section.prefix}
            label={section.label}
            categoryKey={section.category}
            events={section.events}
            numbered={section.numbered ?? false}
            invertLabel={section.invertLabel ?? false}
          />
        ))}
      </div>

      <SubscribeCTA />
      <footer
        className="py-5 text-center"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontSize: 11,
        }}
      >
        &copy; {new Date().getFullYear()} NYC Insider List
      </footer>
    </>
  );
}
