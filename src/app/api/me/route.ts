import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getSessionEmail } from "@/lib/session";
import { getAccessTier, trialDaysLeft } from "@/lib/access-tier";

export const dynamic = "force-dynamic";

/** Current visitor's access state, derived from the session cookie. */
export async function GET(request: NextRequest) {
  const email = getSessionEmail(request);
  if (!email) {
    return NextResponse.json(
      { tier: "free", email: null, trialDaysLeft: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = createServiceClient();
  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("email, status, trial_started_at, trial_ends_at")
    .eq("email", email)
    .maybeSingle();

  return NextResponse.json(
    {
      tier: getAccessTier(subscriber),
      email,
      trialDaysLeft: trialDaysLeft(subscriber),
      trialAlreadyUsed: Boolean(subscriber?.trial_started_at),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
