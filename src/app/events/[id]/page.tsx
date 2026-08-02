import { createServiceClient } from "@/lib/supabase";
import { getCategoryMeta, SITE_URL } from "@/lib/constants";
import { googleCalendarUrl, parseEventTime } from "@/lib/ics";
import type { Event, HappyHour } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink, Calendar, MapPin, CalendarPlus, Martini } from "lucide-react";
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

/** "Drinks first?" — happy hours near the event that wrap up before showtime. */
async function getNearbyHappyHours(event: Event): Promise<HappyHour[]> {
  if (!event.neighborhood && !event.borough) return [];
  const supabase = createServiceClient();
  const dayName = format(parseISO(event.date), "EEEE");

  let query = supabase
    .from("happy_hours")
    .select("*")
    .eq("is_active", true)
    .contains("days", [dayName])
    .order("quality_score", { ascending: false })
    .limit(30);
  if (event.neighborhood) query = query.eq("neighborhood", event.neighborhood);
  else if (event.borough) query = query.eq("borough", event.borough);

  const { data } = await query;
  let candidates = (data ?? []) as HappyHour[];

  // Fall back to the borough if the neighborhood strikes out
  if (candidates.length === 0 && event.neighborhood && event.borough) {
    const { data: boroughData } = await supabase
      .from("happy_hours")
      .select("*")
      .eq("is_active", true)
      .eq("borough", event.borough)
      .contains("days", [dayName])
      .order("quality_score", { ascending: false })
      .limit(30);
    candidates = (boroughData ?? []) as HappyHour[];
  }

  // Prefer spots whose happy hour starts before the event does
  const eventStart = parseEventTime(event.time);
  if (eventStart) {
    const startsBefore = candidates.filter((h) => {
      const hhStart = parseEventTime(h.start_time);
      return hhStart ? hhStart.h < eventStart.h : true;
    });
    if (startsBefore.length >= 3) candidates = startsBefore;
  }

  return candidates.slice(0, 3);
}

function buildEventJsonLd(event: Event) {
  const start = parseEventTime(event.time);
  const startDate = start
    ? `${event.date}T${String(start.h).padStart(2, "0")}:${String(start.m).padStart(2, "0")}:00-04:00`
    : event.date;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue ?? "New York City",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address ?? undefined,
        addressLocality: event.borough ?? "New York",
        addressRegion: "NY",
        addressCountry: "US",
      },
    },
    description: event.description?.slice(0, 500) ?? undefined,
    offers: event.is_free
      ? { "@type": "Offer", price: "0", priceCurrency: "USD", url: event.url ?? undefined }
      : event.url
        ? { "@type": "Offer", url: event.url }
        : undefined,
    url: `${SITE_URL}/events/${event.id}`,
  };
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
  const happyHours = event ? await getNearbyHappyHours(event) : [];

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

        {/* Drinks first? — happy hours nearby that pair with the event */}
        {happyHours.length > 0 && (
          <div className="mt-8">
            <h2
              className="flex items-center gap-2"
              style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}
            >
              <Martini style={{ width: 14, height: 14, color: "var(--gold)" }} />
              Drinks first? Happy hours nearby
            </h2>
            <div className="flex flex-col gap-2">
              {happyHours.map((hh) => (
                <a
                  key={hh.id}
                  href={hh.website_url ?? hh.google_maps_url ?? "/happy-hours"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border transition hover:opacity-85"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", padding: "12px 16px" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>
                        {hh.name}
                      </p>
                      <p className="truncate" style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {[hh.neighborhood, hh.start_time && hh.end_time ? `${hh.start_time}–${hh.end_time}` : null, hh.drink_specials]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <ExternalLink className="shrink-0" style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                  </div>
                </a>
              ))}
            </div>
          </div>
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
          <a
            href={`/api/event-ics/${event.id}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border transition hover:opacity-80"
            style={{
              borderColor: "var(--border)",
              color: "var(--text)",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 20px",
            }}
          >
            <CalendarPlus style={{ width: 14, height: 14 }} />
            Add to Calendar
          </a>
          <a
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
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
            Google Calendar
          </a>
        </div>

        {/* schema.org Event markup for Google's event surfaces */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEventJsonLd(event)) }}
        />

        {/* Source attribution */}
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 24, textAlign: "center" }}>
          Event data sourced from public listings. Verify details with the venue.
        </p>
      </main>
      <Footer />
    </>
  );
}
