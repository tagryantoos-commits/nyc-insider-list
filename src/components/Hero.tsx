"use client";

import { Search } from "lucide-react";

export default function Hero({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  return (
    <section className="px-4 pb-8 pt-16 text-center sm:px-6 sm:pt-20">
      <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
        <span className="gradient-text">What&apos;s happening</span>
        <br />
        <span className="text-white/90">in New York</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-white/40 sm:text-lg">
        Curated events across rooftops, Broadway, concerts, museums, and more.
        Updated weekly.
      </p>

      <div className="relative mx-auto mt-8 max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events, venues, neighborhoods..."
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-blue-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/30"
        />
      </div>
    </section>
  );
}
