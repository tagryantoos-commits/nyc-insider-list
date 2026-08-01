import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSessionEmail } from "@/lib/session";
import {
  generatePlanSlug,
  MAX_PLAN_EVENTS,
  MAX_TITLE_LENGTH,
  MAX_NOTE_LENGTH,
} from "@/lib/plans";

/** Create a shareable plan from a set of event ids. Anyone can share. */
export async function POST(request: NextRequest) {
  let body: { title?: string; note?: string; eventIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = (body.title ?? "").trim().slice(0, MAX_TITLE_LENGTH);
  const note = (body.note ?? "").trim().slice(0, MAX_NOTE_LENGTH) || null;
  const eventIds = Array.isArray(body.eventIds) ? body.eventIds : [];

  if (!title) {
    return NextResponse.json({ error: "Give your plan a name." }, { status: 400 });
  }
  if (eventIds.length === 0 || eventIds.length > MAX_PLAN_EVENTS) {
    return NextResponse.json(
      { error: `Plans need 1–${MAX_PLAN_EVENTS} events.` },
      { status: 400 },
    );
  }
  if (!eventIds.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) {
    return NextResponse.json({ error: "Invalid event ids" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Only keep ids that exist so shared pages never render holes
  const { data: found, error: lookupError } = await supabase
    .from("events")
    .select("id")
    .in("id", eventIds);
  if (lookupError) {
    console.error("Plan event lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  const validIds = eventIds.filter((id) => found?.some((f) => f.id === id));
  if (validIds.length === 0) {
    return NextResponse.json({ error: "Those events no longer exist." }, { status: 400 });
  }

  const creatorEmail = getSessionEmail(request);

  // Retry on slug collision (astronomically rare, but cheap to handle)
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generatePlanSlug();
    const { error: insertError } = await supabase.from("shared_plans").insert({
      id: slug,
      creator_email: creatorEmail,
      title,
      note,
      event_ids: validIds,
    });
    if (!insertError) {
      return NextResponse.json({ ok: true, slug, url: `/p/${slug}` });
    }
    if (!insertError.message.includes("duplicate")) {
      console.error("Plan insert failed:", insertError.message);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Please try again." }, { status: 500 });
}
