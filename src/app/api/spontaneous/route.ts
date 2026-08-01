import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { parseEventTime } from "@/lib/ics";
import type { Event } from "@/lib/types";

/**
 * "I'm Feeling Spontaneous" — things you could walk out the door for right now.
 * Returns a queue of events starting in the next ~5 hours (or live now),
 * best first, for one-card-at-a-time browsing.
 */

function nycNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

function nycToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function spontaneityScore(event: Event, nowHour: number): number {
  const t = parseEventTime(event.time);
  let score = 10;
  if (t) {
    const hour = t.h < 6 ? t.h + 24 : t.h;
    const delta = hour - nowHour;
    if (delta < -3 || delta > 5) return -1; // already over or too far out
    if (delta >= 0 && delta <= 2) score += 30; // starting within 2h is the sweet spot
    else if (delta > 2) score += 15;
    else score += 10; // started, likely still going
  } else {
    score += 5; // untimed (all-day) things are fine but less exciting
  }
  if (event.is_featured) score += 20;
  if (event.is_free) score += 15;
  if (event.title.length > 120) return -1; // junk guard
  const soldOut = event.title.toLowerCase().includes("sold out");
  if (soldOut) return -1;
  return score;
}

export async function GET() {
  const supabase = createServiceClient();
  const now = nycNow();

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("date", nycToday())
    .limit(500);

  if (error) {
    console.error("Spontaneous fetch failed:", error.message);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const queue = (events ?? [])
    .map((e) => ({ event: e, score: spontaneityScore(e, nowHour) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map((s) => s.event);

  return NextResponse.json(
    { ok: true, events: queue },
    { headers: { "Cache-Control": "no-store" } },
  );
}
