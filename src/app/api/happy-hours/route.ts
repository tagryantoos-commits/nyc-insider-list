import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const neighborhood = searchParams.get("neighborhood");
  const borough = searchParams.get("borough");
  const vibe = searchParams.get("vibe");
  const hasFood = searchParams.get("has_food");
  const hasMusic = searchParams.get("has_music");
  const hasOutdoor = searchParams.get("has_outdoor");
  const priceTier = searchParams.get("price_tier");
  const q = searchParams.get("q");
  const happeningNow = searchParams.get("happening_now");
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "60", 10), 200);
  const sort = searchParams.get("sort") ?? "quality";

  const supabase = createServiceClient();
  let query = supabase
    .from("happy_hours")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (neighborhood) query = query.eq("neighborhood", neighborhood);
  if (borough) query = query.eq("borough", borough);
  if (vibe) query = query.eq("vibe", vibe);
  if (hasFood === "true") query = query.eq("has_food_specials", true);
  if (hasMusic === "true") query = query.eq("has_live_music", true);
  if (hasOutdoor === "true") query = query.eq("has_outdoor_seating", true);
  if (priceTier) query = query.eq("price_tier", priceTier);
  if (q) query = query.or(`name.ilike.%${q}%,neighborhood.ilike.%${q}%,drink_specials.ilike.%${q}%,food_specials.ilike.%${q}%`);

  // Sort
  if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else if (sort === "neighborhood") {
    query = query.order("neighborhood", { ascending: true });
  } else if (sort === "price-low") {
    query = query.order("price_tier", { ascending: true });
  } else if (sort === "price-high") {
    query = query.order("price_tier", { ascending: false });
  } else {
    query = query.order("quality_score", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter "happening now" client-side since time comparison is complex in SQL
  let results = data ?? [];
  if (happeningNow === "true") {
    const now = new Date();
    const etFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
    });
    const currentTime = etFormatter.format(now);
    const currentDay = dayFormatter.format(now);
    const currentMinutes = parseTimeToMinutes(currentTime);

    results = results.filter((venue) => {
      if (!venue.start_time || !venue.end_time) return false;
      const startMin = parseTimeToMinutes(venue.start_time);
      const endMin = parseTimeToMinutes(venue.end_time);
      if (startMin === null || endMin === null) return false;
      if (currentMinutes === null) return false;

      // Check day if venue has days specified
      if (venue.days && venue.days.length > 0) {
        const dayMatch = venue.days.some(
          (d: string) => d.toLowerCase().startsWith(currentDay.toLowerCase().slice(0, 3))
        );
        if (!dayMatch) return false;
      }

      // Handle overnight (end < start means it crosses midnight)
      if (endMin < startMin) {
        return currentMinutes >= startMin || currentMinutes <= endMin;
      }
      return currentMinutes >= startMin && currentMinutes <= endMin;
    });
  }

  return NextResponse.json({ data: results, total: count ?? results.length });
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  // Handle formats: "4:00 PM", "4pm", "16:00", "4:00", "4 PM"
  const cleaned = timeStr.trim().toLowerCase();

  let hours: number;
  let minutes = 0;
  let isPM = cleaned.includes("pm");
  let isAM = cleaned.includes("am");

  const match = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return null;

  hours = parseInt(match[1], 10);
  if (match[2]) minutes = parseInt(match[2], 10);
  if (match[3]) {
    isPM = match[3].toLowerCase() === "pm";
    isAM = match[3].toLowerCase() === "am";
  }

  if (isPM && hours !== 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}
