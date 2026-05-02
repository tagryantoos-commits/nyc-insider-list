"use client";

import { Search } from "lucide-react";

export default function Hero({
  searchQuery,
  onSearchChange,
  eventCount,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  eventCount: number;
}) {
  return (
    <section className="px-5 pb-6 pt-14 text-center sm:pt-20">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#fafafa] sm:text-[42px]">
        What&apos;s happening
        <br />
        <span className="text-[#71717a]">in New York</span>
      </h1>
      <p className="mt-3 text-[13px] text-[#52525b]">
        {eventCount} events. Updated weekly. Subscribe for calendar access.
      </p>

      <div className="relative mx-auto mt-6 max-w-[600px]">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events, venues, neighborhoods..."
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-4 text-[14px] text-[#fafafa] placeholder-[#52525b] outline-none transition focus:border-white/[0.15]"
        />
      </div>
    </section>
  );
}
