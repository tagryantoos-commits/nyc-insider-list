import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/session";
import { isValidEmail, isDisposableEmail, normalizeEmail } from "@/lib/trial";
import { getAccessTier, trialDaysLeft, TRIAL_DAYS } from "@/lib/access-tier";

/**
 * Instant no-card trial start.
 *
 * - New email: creates a subscriber row with a 10-day trial and signs them in.
 * - Existing email: signs them in with whatever access they already have
 *   (active sub, running trial, or expired trial — never a fresh trial).
 *
 * One trial per email, ever. Enforced by trial_started_at being set exactly once.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "website" field
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: "Please use your real email address to start a trial." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: existing, error: lookupError } = await supabase
    .from("subscribers")
    .select("id, email, status, trial_started_at, trial_ends_at")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("Trial start lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  let subscriber = existing;
  let startedNewTrial = false;

  if (!existing) {
    const now = new Date();
    const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const { data: created, error: insertError } = await supabase
      .from("subscribers")
      .insert({
        email,
        status: "inactive",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      })
      .select("id, email, status, trial_started_at, trial_ends_at")
      .single();

    if (insertError) {
      console.error("Trial start insert failed:", insertError.message);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    subscriber = created;
    startedNewTrial = true;
  }

  const tier = getAccessTier(subscriber);
  const response = NextResponse.json({
    ok: true,
    tier,
    startedNewTrial,
    trialDaysLeft: trialDaysLeft(subscriber),
    trialAlreadyUsed: Boolean(subscriber?.trial_started_at) && !startedNewTrial && tier === "free",
  });
  setSessionCookie(response, email);
  return response;
}
