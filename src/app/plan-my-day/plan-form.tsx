"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MOODS, type Mood, type Duration, type Group, type PlanBlock } from "@/lib/plan-my-day";
import PlanTimeline from "@/components/PlanTimeline";

const DURATIONS: { key: Duration; label: string }[] = [
  { key: "few-hours", label: "A few hours" },
  { key: "half-day", label: "Half day" },
  { key: "full-day", label: "Full day" },
];

const GROUPS: { key: Group; label: string; emoji: string }[] = [
  { key: "just-me", label: "Just me", emoji: "🚶" },
  { key: "date-night", label: "Date night", emoji: "🥂" },
  { key: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { key: "friends", label: "Friends", emoji: "🎉" },
];

export default function PlanForm() {
  const searchParams = useSearchParams();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [duration, setDuration] = useState<Duration>("half-day");
  const [group, setGroup] = useState<Group>("just-me");
  const [seed, setSeed] = useState(1);
  const [blocks, setBlocks] = useState<PlanBlock[] | null>(null);
  const [weatherSummary, setWeatherSummary] = useState<string | null>(null);
  const [weatherNote, setWeatherNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(
    async (opts?: { moods?: Mood[]; duration?: Duration; group?: Group; seed?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/plan-my-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moods: opts?.moods ?? moods,
            duration: opts?.duration ?? duration,
            group: opts?.group ?? group,
            seed: opts?.seed ?? seed,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong");
          return;
        }
        setBlocks(data.blocks);
        setWeatherSummary(data.weatherSummary);
        setWeatherNote(data.weatherNote);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [moods, duration, group, seed],
  );

  // Shareable URLs: /plan-my-day?moods=live-music,food-drink&duration=half-day&group=friends&seed=3
  useEffect(() => {
    const urlMoods = searchParams.get("moods")?.split(",").filter(Boolean) as Mood[] | undefined;
    const urlDuration = searchParams.get("duration") as Duration | null;
    const urlGroup = searchParams.get("group") as Group | null;
    const urlSeed = Number(searchParams.get("seed"));
    if (urlMoods?.length || urlDuration || urlGroup) {
      const m = urlMoods ?? [];
      const d = urlDuration ?? "half-day";
      const g = urlGroup ?? "just-me";
      const s = Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : 1;
      setMoods(m);
      setDuration(d);
      setGroup(g);
      setSeed(s);
      generate({ moods: m, duration: d, group: g, seed: s });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMood(mood: Mood) {
    setMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood].slice(-4),
    );
  }

  function shuffle() {
    const next = seed + 1;
    setSeed(next);
    generate({ seed: next });
  }

  const shareUrl = () => {
    const params = new URLSearchParams();
    if (moods.length) params.set("moods", moods.join(","));
    params.set("duration", duration);
    params.set("group", group);
    params.set("seed", String(seed));
    return `${window.location.origin}/plan-my-day?${params.toString()}`;
  };

  return (
    <div className="mt-8">
      {/* Mood chips */}
      <p className="section-label">What&apos;s the vibe?</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {MOODS.map((m) => {
          const active = moods.includes(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggleMood(m.key)}
              className="rounded-full border px-4 transition"
              style={{
                height: 44,
                fontSize: 13,
                fontWeight: 600,
                borderColor: active ? "var(--gold)" : "var(--border)",
                color: active ? "var(--gold)" : "var(--text-secondary)",
                background: active ? "rgba(240,200,64,0.08)" : "transparent",
              }}
            >
              {m.emoji} {m.label}
            </button>
          );
        })}
      </div>

      {/* Duration */}
      <p className="section-label mt-6">How long have you got?</p>
      <div className="flex gap-2 mt-3">
        {DURATIONS.map((d) => (
          <button
            key={d.key}
            onClick={() => setDuration(d.key)}
            className="flex-1 rounded-md border transition"
            style={{
              height: 44,
              fontSize: 13,
              fontWeight: 600,
              borderColor: duration === d.key ? "var(--gold)" : "var(--border)",
              color: duration === d.key ? "var(--gold)" : "var(--text-secondary)",
              background: duration === d.key ? "rgba(240,200,64,0.08)" : "transparent",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Group */}
      <p className="section-label mt-6">Who&apos;s coming?</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setGroup(g.key)}
            className="rounded-md border transition"
            style={{
              height: 44,
              fontSize: 13,
              fontWeight: 600,
              borderColor: group === g.key ? "var(--gold)" : "var(--border)",
              color: group === g.key ? "var(--gold)" : "var(--text-secondary)",
              background: group === g.key ? "rgba(240,200,64,0.08)" : "transparent",
            }}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => generate()}
        disabled={loading}
        className="w-full mt-7 rounded-md transition disabled:opacity-40 hover:opacity-90"
        style={{ height: 48, background: "var(--gold)", color: "#0a0a0f", fontSize: 15, fontWeight: 700 }}
      >
        {loading ? "Building your day..." : blocks ? "Rebuild my day" : "Build my day"}
      </button>
      {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

      {/* Result */}
      {blocks && (
        <PlanTimeline
          blocks={blocks}
          weatherSummary={weatherSummary}
          weatherNote={weatherNote}
          onShuffle={shuffle}
          shuffling={loading}
          getShareUrl={shareUrl}
          planTitle="My NYC day"
        />
      )}
    </div>
  );
}
