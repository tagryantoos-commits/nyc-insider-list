import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { buildDayPlan, MOODS, type Mood, type Duration, type Group } from "@/lib/plan-my-day";
import { checkNycWeather } from "@/lib/weather";

// Simple in-memory rate limit (per serverless instance): 30 req/hr per IP
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 3600_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 30;
}

const DURATIONS: Duration[] = ["few-hours", "half-day", "full-day"];
const GROUPS: Group[] = ["just-me", "date-night", "family", "friends"];
const VALID_MOODS = new Set(MOODS.map((m) => m.key));

function nycToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Slow down — try again in a bit." }, { status: 429 });
  }

  let body: { moods?: string[]; duration?: string; group?: string; seed?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const moods = (Array.isArray(body.moods) ? body.moods : [])
    .filter((m): m is Mood => VALID_MOODS.has(m as Mood))
    .slice(0, 4);
  const duration = DURATIONS.includes(body.duration as Duration)
    ? (body.duration as Duration)
    : "half-day";
  const group = GROUPS.includes(body.group as Group) ? (body.group as Group) : "just-me";
  const seed = Number.isFinite(body.seed) ? Math.abs(Math.floor(body.seed!)) : 1;

  const supabase = createServiceClient();
  const today = nycToday();

  const [{ data: events }, { data: happyHours }, weather] = await Promise.all([
    supabase.from("events").select("*").eq("date", today).limit(500),
    supabase
      .from("happy_hours")
      .select("*")
      .eq("is_active", true)
      .gte("quality_score", 6)
      .limit(400),
    checkNycWeather(),
  ]);

  const plan = buildDayPlan(
    events ?? [],
    happyHours ?? [],
    { moods, duration, group, seed, badWeather: weather.badWeather },
    new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })),
  );

  return NextResponse.json({
    ok: true,
    blocks: plan.blocks,
    weatherNote: plan.weatherNote,
    weatherSummary: weather.summary,
  });
}
