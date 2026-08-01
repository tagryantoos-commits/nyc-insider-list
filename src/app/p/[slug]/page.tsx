import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { createServiceClient } from "@/lib/supabase";
import { isValidSlug, isPlanExpired, type PlanRsvp } from "@/lib/plans";
import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import RsvpSection from "./rsvp-section";

export const dynamic = "force-dynamic";

async function getPlan(slug: string) {
  if (!isValidSlug(slug)) return null;
  const supabase = createServiceClient();
  const { data: plan } = await supabase
    .from("shared_plans")
    .select("*")
    .eq("id", slug)
    .maybeSingle();
  if (!plan || isPlanExpired(plan)) return null;
  return plan;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) return { title: "Plan not found — NYC Insider List" };
  const count = plan.event_ids.length;
  return {
    title: `${plan.title} — NYC Insider List`,
    description: `A plan with ${count} NYC ${count === 1 ? "event" : "events"}. RSVP and see the lineup.`,
    openGraph: {
      title: plan.title,
      description: `${count} NYC ${count === 1 ? "event" : "events"} — are you in?`,
      siteName: "NYC Insider List",
    },
  };
}

export default async function SharedPlanPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) notFound();

  const supabase = createServiceClient();

  // Fire-and-forget view count bump
  supabase
    .rpc("increment_plan_views", { plan_slug: slug })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error("view count bump failed:", error.message);
    });

  const [{ data: events }, { data: rsvps }] = await Promise.all([
    supabase.from("events").select("*").in("id", plan.event_ids),
    supabase
      .from("plan_rsvps")
      .select("id, plan_id, name, response, created_at")
      .eq("plan_id", slug)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  const sortedEvents = ((events ?? []) as Event[]).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const inCount = ((rsvps ?? []) as PlanRsvp[]).filter((r) => r.response === "in").length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-[640px] px-4 py-10">
        {/* Header */}
        <Link
          href="/"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "var(--gold)" }}
        >
          NYC INSIDER LIST
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginTop: 16, lineHeight: 1.2 }}>
          {plan.title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
          {sortedEvents.length} {sortedEvents.length === 1 ? "event" : "events"}
          {inCount > 0 && <> · <span style={{ color: "var(--gold)" }}>{inCount} in so far</span></>}
        </p>
        {plan.note && (
          <p
            className="rounded-lg border px-4 py-3 mt-4"
            style={{
              fontSize: 14,
              color: "var(--text)",
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              lineHeight: 1.5,
            }}
          >
            {plan.note}
          </p>
        )}

        {/* Event lineup */}
        <div className="flex flex-col gap-2 mt-6">
          {sortedEvents.map((event) => {
            const meta = getCategoryMeta(event.category);
            const metaParts = [format(parseISO(event.date), "EEE, MMM d")];
            if (event.time) metaParts.push(event.time);
            if (event.venue) metaParts.push(event.venue);
            return (
              <div
                key={event.id}
                className="rounded-lg border"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border)",
                  borderLeftWidth: 2,
                  borderLeftColor: `${meta.color}40`,
                  padding: "14px 16px",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: meta.color,
                      }}
                    >
                      {event.category}
                    </span>
                    <h3 className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 4 }}>
                      {event.title}
                    </h3>
                    <p className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                      {metaParts.join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {event.is_free && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--free)" }}>Free</span>
                    )}
                    <a
                      href={`/api/event-ics/${event.id}`}
                      style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)" }}
                    >
                      + Calendar
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RSVP */}
        <RsvpSection slug={slug} initialRsvps={(rsvps ?? []) as PlanRsvp[]} />

        {/* Viral loop: visitors get the trial pitch */}
        <div
          className="rounded-xl border text-center mt-8"
          style={{ background: "var(--bg-card)", borderColor: "rgba(240,200,64,0.35)", padding: "24px 20px" }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            Want plans like this every week?
          </p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
            Every NYC event in one place — rooftops, comedy, concerts, free stuff.
          </p>
          <Link
            href="/subscribe"
            className="inline-block rounded-md mt-4 transition hover:opacity-90"
            style={{
              padding: "10px 24px",
              background: "var(--gold)",
              color: "#0a0a0f",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Start free 10-day trial
          </Link>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
