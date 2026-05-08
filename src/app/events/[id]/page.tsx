import { createServiceClient } from "@/lib/supabase";
import { getCategoryMeta } from "@/lib/constants";
import type { Event } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink, Calendar, MapPin, Clock, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const revalidate = 3600;

async function getEvent(id: string): Promise<Event | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Event;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Event Not Found" };
  return {
    title: `${event.title} — NYC Insider List`,
    description:
      event.description ??
      `${event.category} event at ${event.venue ?? "NYC"}. ${event.date}.`,
    openGraph: {
      title: event.title,
      description: event.description ?? `${event.category} event in NYC`,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-[700px] px-4 py-20 text-center">
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--text)" }}>
            Event not found
          </h1>
          <Link
            href="/events"
            style={{ color: "var(--gold)", fontSize: 14, marginTop: 12, display: "inline-block" }}
          >
            Browse all events
          </Link>
        </div>
      </>
    );
  }

  const meta = getCategoryMeta(event.category);
  const dateStr = format(parseISO(event.date), "EEEE, MMMM d, yyyy");
  const isFree = event.is_free;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[700px] px-4 py-8">
        {/* Back */}
        <Link
          href="/events"
          className="inline-flex items-center gap-1 mb-6"
          style={{ fontSize: 13, color: "var(--text-secondary)" }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          All events
        </Link>

        {/* Category + Price row */}
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: meta.color,
            }}
          >
            {event.category}
          </span>
          {(isFree || event.cost) && (
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: isFree ? "var(--free)" : "var(--gold)",
              }}
            >
              {isFree ? "Free" : event.cost}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
          {event.title}
        </h1>

        {/* Meta grid */}
        <div
          className="grid gap-3 mt-6 rounded-lg border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
            padding: "16px 20px",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div className="flex items-start gap-2">
            <Calendar style={{ width: 14, height: 14, color: "var(--text-muted)", marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{dateStr}</p>
              {event.time && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {event.time}
                  {event.end_time ? ` - ${event.end_time}` : ""}
                </p>
              )}
            </div>
          </div>

          {event.venue && (
            <div className="flex items-start gap-2">
              <MapPin style={{ width: 14, height: 14, color: "var(--text-muted)", marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{event.venue}</p>
                {event.neighborhood && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {event.neighborhood}
                    {event.borough ? `, ${event.borough}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="mt-6">
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              About
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                whiteSpace: "pre-line",
              }}
            >
              {event.description}
            </p>
          </div>
        )}

        {/* Map link */}
        {event.venue && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${event.venue} ${event.neighborhood ?? ""} NYC`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-6 rounded-lg border transition hover:opacity-80"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
              padding: "12px 16px",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            <MapPin style={{ width: 14, height: 14 }} />
            View on Google Maps
            <ExternalLink style={{ width: 12, height: 12, marginLeft: "auto" }} />
          </a>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-lg transition hover:opacity-90"
              style={{
                background: "var(--gold)",
                color: "#000",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 20px",
              }}
            >
              View Tickets / Event Page
              <ExternalLink style={{ width: 14, height: 14 }} />
            </a>
          )}
          <Link
            href="/subscribe"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border transition hover:opacity-80"
            style={{
              borderColor: "var(--border)",
              color: "var(--text)",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 20px",
            }}
          >
            <Calendar style={{ width: 14, height: 14 }} />
            Add to Calendar — $2.99/mo
          </Link>
        </div>

        {/* Source attribution */}
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 24, textAlign: "center" }}>
          Event data sourced from public listings. Verify details with the venue.
        </p>
      </main>
      <Footer />
    </>
  );
}
