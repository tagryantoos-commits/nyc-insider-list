import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const borough = searchParams.get("borough");
  const free = searchParams.get("free");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q");
  const featured = searchParams.get("featured");

  const supabase = createServiceClient();
  let query = supabase.from("events").select("*").order("date", { ascending: true });

  // Filter out past events by default
  const includePast = searchParams.get("include_past") === "true";
  if (!includePast && !from) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("date", today);
  }

  if (category) query = query.eq("category", category);
  if (borough) query = query.eq("borough", borough);
  if (free === "true") query = query.eq("is_free", true);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (featured === "true") query = query.eq("is_featured", true);
  if (q) query = query.or(`title.ilike.%${q}%,venue.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
