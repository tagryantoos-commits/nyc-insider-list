"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { HappyHour, HHSortMode } from "@/lib/types";
import { VIBES, getVibeMeta } from "@/lib/types";
import { Search, X, SlidersHorizontal } from "lucide-react";
import HappyHourCard from "./HappyHourCard";
import Navbar from "./Navbar";
import Link from "next/link";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx"];
const PRICE_TIERS = ["$", "$$", "$$$"];
const PAGE_SIZE = 60;

const NEIGHBORHOODS: Record<string, string[]> = {
  Manhattan: [
    "Lower East Side", "East Village", "West Village", "Greenwich Village",
    "SoHo", "NoHo", "Tribeca", "Chelsea", "Flatiron", "Gramercy",
    "Murray Hill", "Midtown East", "Midtown West", "Hell's Kitchen",
    "Upper East Side", "Upper West Side", "Harlem", "Financial District",
    "Chinatown", "Little Italy", "Nolita", "Meatpacking District", "NoMad", "Kips Bay",
  ],
  Brooklyn: [
    "Williamsburg", "Bushwick", "Greenpoint", "DUMBO", "Park Slope",
    "Cobble Hill", "Carroll Gardens", "Boerum Hill", "Fort Greene",
    "Clinton Hill", "Prospect Heights", "Crown Heights", "Bay Ridge",
    "Bed-Stuy", "Flatbush", "Brooklyn Heights", "Gowanus", "Red Hook",
  ],
  Queens: ["Astoria", "Long Island City", "Jackson Heights", "Flushing", "Forest Hills", "Sunnyside"],
  Bronx: ["South Bronx", "Fordham", "Arthur Avenue"],
};

export default function HappyHourExplorer() {
  const [venues, setVenues] = useState<HappyHour[]>([]);
  const [happeningNow, setHappeningNow] = useState<HappyHour[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filters
  const [borough, setBorough] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [vibe, setVibe] = useState<string>("");
  const [priceTier, setPriceTier] = useState<string>("");
  const [hasFood, setHasFood] = useState(false);
  const [hasMusic, setHasMusic] = useState(false);
  const [hasOutdoor, setHasOutdoor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<HHSortMode>("quality");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback(
    (extraOffset?: number) => {
      const params = new URLSearchParams();
      if (borough) params.set("borough", borough);
      if (neighborhood) params.set("neighborhood", neighborhood);
      if (vibe) params.set("vibe", vibe);
      if (priceTier) params.set("price_tier", priceTier);
      if (hasFood) params.set("has_food", "true");
      if (hasMusic) params.set("has_music", "true");
      if (hasOutdoor) params.set("has_outdoor", "true");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      params.set("sort", sortMode);
      params.set("offset", String(extraOffset ?? 0));
      params.set("limit", String(PAGE_SIZE));
      return params;
    },
    [borough, neighborhood, vibe, priceTier, hasFood, hasMusic, hasOutdoor, searchQuery, sortMode],
  );

  // Fetch main list
  useEffect(() => {
    setLoading(true);
    setOffset(0);
    const params = buildParams(0);
    fetch(`/api/happy-hours?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVenues(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildParams]);

  // Fetch happening now
  useEffect(() => {
    fetch("/api/happy-hours?happening_now=true&limit=30&sort=quality")
      .then((r) => r.json())
      .then((d) => setHappeningNow(d.data ?? []))
      .catch(() => {});

    const interval = setInterval(() => {
      fetch("/api/happy-hours?happening_now=true&limit=30&sort=quality")
        .then((r) => r.json())
        .then((d) => setHappeningNow(d.data ?? []))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && venues.length < total) {
          setLoadingMore(true);
          const nextOffset = offset + PAGE_SIZE;
          const params = buildParams(nextOffset);
          fetch(`/api/happy-hours?${params}`)
            .then((r) => r.json())
            .then((d) => {
              setVenues((prev) => [...prev, ...(d.data ?? [])]);
              setOffset(nextOffset);
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 },
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [venues.length, total, loadingMore, offset, buildParams]);

  const sidebarContent = (
    <>
      {/* Borough */}
      <Section title="Borough">
        <RadioGroup
          options={[{ value: "", label: "All" }, ...BOROUGHS.map((b) => ({ value: b, label: b }))]}
          value={borough}
          onChange={(v) => { setBorough(v); setNeighborhood(""); }}
        />
      </Section>

      {/* Neighborhood */}
      <Section title="Neighborhood">
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="w-full rounded-md border outline-none"
          style={{
            fontSize: 13, height: 32, paddingLeft: 8, paddingRight: 8,
            background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)",
          }}
        >
          <option value="">All neighborhoods</option>
          {Object.entries(NEIGHBORHOODS)
            .filter(([b]) => !borough || b === borough)
            .map(([b, hoods]) => (
              <optgroup key={b} label={b}>
                {hoods.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </optgroup>
            ))}
        </select>
      </Section>

      {/* Vibe */}
      <Section title="Vibe">
        <RadioGroup
          options={[{ value: "", label: "All" }, ...VIBES.map((v) => ({ value: v.key, label: v.label }))]}
          value={vibe}
          onChange={setVibe}
        />
      </Section>

      {/* Price */}
      <Section title="Price">
        <RadioGroup
          options={[{ value: "", label: "All" }, ...PRICE_TIERS.map((p) => ({ value: p, label: p }))]}
          value={priceTier}
          onChange={setPriceTier}
        />
      </Section>

      {/* Features */}
      <Section title="Features">
        <Checkbox label="Food specials" checked={hasFood} onChange={setHasFood} />
        <Checkbox label="Live music" checked={hasMusic} onChange={setHasMusic} />
        <Checkbox label="Outdoor seating" checked={hasOutdoor} onChange={setHasOutdoor} />
      </Section>

      {/* Sort */}
      <Section title="Sort">
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as HHSortMode)}
          className="w-full rounded-md border outline-none"
          style={{
            fontSize: 13, height: 32, paddingLeft: 8, paddingRight: 8,
            background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)",
          }}
        >
          <option value="quality">Best deals</option>
          <option value="name">Name A-Z</option>
          <option value="neighborhood">Neighborhood</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </Section>

      {/* Search */}
      <Section title="Search">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ width: 13, height: 13, color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venues..."
            className="w-full rounded-md border outline-none"
            style={{
              fontSize: 13, height: 32, paddingLeft: 28, paddingRight: 8,
              background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text)",
            }}
          />
        </div>
      </Section>

      <div style={{ marginTop: 20 }}>
        <Link
          href="/subscribe"
          className="block w-full rounded-md text-center"
          style={{
            background: "var(--gold)", color: "#000", fontSize: 12,
            fontWeight: 600, padding: "8px 0",
          }}
        >
          Subscribe $2.99/mo
        </Link>
      </div>
    </>
  );

  return (
    <>
      <Navbar />

      {/* Mobile filter bar */}
      <div
        className="lg:hidden sticky z-40 border-b flex items-center gap-2 px-4 py-2 overflow-x-auto hide-scrollbar"
        style={{ top: 52, background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="shrink-0 flex items-center gap-1 rounded-md"
          style={{
            padding: "4px 10px", fontSize: 12, fontWeight: 500,
            color: showMobileFilters ? "#fff" : "var(--text-muted)",
            background: showMobileFilters ? "rgba(255,255,255,0.08)" : "transparent",
          }}
        >
          <SlidersHorizontal style={{ width: 12, height: 12 }} /> Filters
        </button>
        {VIBES.slice(0, 6).map((v) => (
          <button
            key={v.key}
            onClick={() => setVibe(vibe === v.key ? "" : v.key)}
            className="shrink-0 flex items-center gap-1.5 rounded-md"
            style={{
              padding: "4px 10px", fontSize: 12, fontWeight: 500,
              background: vibe === v.key ? "rgba(255,255,255,0.08)" : "transparent",
              color: vibe === v.key ? "#fff" : "var(--text-muted)",
            }}
          >
            <span className="rounded-full" style={{ width: 6, height: 6, backgroundColor: v.color }} />
            {v.label}
          </button>
        ))}
      </div>

      {/* Mobile filters drawer */}
      {showMobileFilters && (
        <div
          className="lg:hidden border-b"
          style={{ background: "var(--bg)", borderColor: "var(--border)", padding: "12px 16px" }}
        >
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Filters</span>
            <button onClick={() => setShowMobileFilters(false)} style={{ color: "var(--text-muted)" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {sidebarContent}
        </div>
      )}

      <div className="mx-auto flex max-w-[1200px]">
        {/* Desktop sidebar */}
        <aside
          className="hidden lg:block shrink-0 sticky self-start overflow-y-auto border-r"
          style={{
            width: 200, top: 52, height: "calc(100vh - 52px)",
            borderColor: "var(--border)", background: "var(--bg)",
            padding: "16px 14px",
          }}
        >
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-5 lg:px-6">
          {/* Happening Now */}
          {happeningNow.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: "#22c55e" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                  Happening Now
                </span>
                <span className="flex-1" />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {happeningNow.length} active
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {happeningNow.map((v) => (
                  <div key={v.id} className="shrink-0" style={{ width: 280 }}>
                    <HappyHourCard venue={v} accentOverride="#22c55e" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              All Happy Hours
            </span>
            <span className="flex-1 border-b border-dotted" style={{ borderColor: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {total.toLocaleString()} venues
            </span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", padding: "14px 16px" }}>
                  <div className="skeleton-pulse" style={{ width: 60, height: 11 }} />
                  <div className="skeleton-pulse" style={{ width: "80%", height: 15, marginTop: 8 }} />
                  <div className="skeleton-pulse" style={{ width: "50%", height: 13, marginTop: 6 }} />
                  <div className="skeleton-pulse" style={{ width: "60%", height: 12, marginTop: 8 }} />
                </div>
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="py-20 text-center">
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>No happy hours match your filters</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Try broadening your search</p>
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {venues.map((v) => (
                <HappyHourCard key={v.id} venue={v} />
              ))}
            </div>
          )}

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="py-8 text-center">
            {loadingMore && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading more...</span>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t py-5 text-center" style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontSize: 11 }}>
        &copy; {new Date().getFullYear()} NYC Insider List
      </footer>
    </>
  );
}

// Reusable components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--text-muted)", marginBottom: 6 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function RadioGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex w-full items-center gap-2 rounded-md transition"
          style={{
            height: 28, paddingLeft: 8, paddingRight: 8, fontSize: 13,
            fontWeight: value === opt.value ? 600 : 400,
            color: value === opt.value ? "var(--text)" : "var(--text-secondary)",
            background: value === opt.value ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-emerald-500" />
      {label}
    </label>
  );
}
