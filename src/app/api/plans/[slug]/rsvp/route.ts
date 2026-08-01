import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  isValidSlug,
  isValidRsvpResponse,
  isPlanExpired,
  MAX_RSVP_NAME_LENGTH,
} from "@/lib/plans";

/** Public, no-auth RSVP on a shared plan (name + in/maybe/out). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let body: { name?: string; response?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot
  if (body.website) return NextResponse.json({ ok: true });

  const name = (body.name ?? "").trim().slice(0, MAX_RSVP_NAME_LENGTH);
  if (!name) {
    return NextResponse.json({ error: "Tell your friends who you are." }, { status: 400 });
  }
  if (!isValidRsvpResponse(body.response)) {
    return NextResponse.json({ error: "Pick in, maybe, or out." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: plan } = await supabase
    .from("shared_plans")
    .select("id, expires_at")
    .eq("id", slug)
    .maybeSingle();

  if (!plan || isPlanExpired(plan)) {
    return NextResponse.json({ error: "This plan has expired." }, { status: 404 });
  }

  const { error: insertError } = await supabase.from("plan_rsvps").insert({
    plan_id: slug,
    name,
    response: body.response,
  });
  if (insertError) {
    console.error("RSVP insert failed:", insertError.message);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const { data: rsvps } = await supabase
    .from("plan_rsvps")
    .select("name, response, created_at")
    .eq("plan_id", slug)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ ok: true, rsvps: rsvps ?? [] });
}
