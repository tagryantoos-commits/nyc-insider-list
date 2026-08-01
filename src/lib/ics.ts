import type { Event } from "./types";

/**
 * RFC 5545 .ics generation for one-tap add-to-calendar.
 * All events are anchored to America/New_York via an embedded VTIMEZONE,
 * so imports land at the right wall-clock time regardless of the user's zone.
 */

const TZID = "America/New_York";

// Standard US Eastern VTIMEZONE block (EST/EDT rules since 2007)
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:20070311T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:20071104T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

/** Escape text per RFC 5545: backslash, semicolon, comma, newline. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets with CRLF + space per RFC 5545 §3.1. */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

/** Parse "7:00 PM" / "11:05 AM" into {h, m}; null if unparseable. */
export function parseEventTime(time: string | null): { h: number; m: number } | null {
  if (!time) return null;
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3].toUpperCase();
  if (h > 12 || m > 59) return null;
  if (meridian === "PM" && h !== 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return { h, m };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "2026-08-05" + {h,m} → "20260805T190000" (floating local, used with TZID). */
function toIcsDateTime(date: string, h: number, m: number): string {
  return `${date.replace(/-/g, "")}T${pad(h)}${pad(m)}00`;
}

function nowUtcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildVevent(event: Event): string {
  const lines: string[] = ["BEGIN:VEVENT"];
  lines.push(`UID:${event.id}@nycinsiderlist`);
  lines.push(`DTSTAMP:${nowUtcStamp()}`);

  const start = parseEventTime(event.time);
  if (start) {
    lines.push(`DTSTART;TZID=${TZID}:${toIcsDateTime(event.date, start.h, start.m)}`);
    const end = parseEventTime(event.end_time);
    if (end && (end.h > start.h || (end.h === start.h && end.m > start.m))) {
      lines.push(`DTEND;TZID=${TZID}:${toIcsDateTime(event.date, end.h, end.m)}`);
    } else {
      // Default 2-hour duration keeps calendars tidy without guessing end times
      const endH = Math.min(start.h + 2, 23);
      lines.push(`DTEND;TZID=${TZID}:${toIcsDateTime(event.date, endH, start.m)}`);
    }
  } else {
    // No parseable time → all-day event
    lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

  const locationParts = [event.venue, event.address].filter(Boolean) as string[];
  if (locationParts.length) {
    lines.push(`LOCATION:${escapeIcsText(locationParts.join(", "))}`);
  }

  const descParts: string[] = [];
  if (event.description) descParts.push(event.description.slice(0, 500));
  if (event.url) descParts.push(`Tickets: ${event.url}`);
  descParts.push("Found on NYC Insider List");
  lines.push(`DESCRIPTION:${escapeIcsText(descParts.join("\n\n"))}`);

  if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);
  lines.push("END:VEVENT");
  return lines.map(foldIcsLine).join("\r\n");
}

export function buildIcs(events: Event[], calName = "NYC Insider List"): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NYC Insider List//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(calName)}`),
    VTIMEZONE,
  ].join("\r\n");
  const body = events.map(buildVevent).join("\r\n");
  return `${header}\r\n${body}\r\nEND:VCALENDAR\r\n`;
}

export function buildSingleEventIcs(event: Event): string {
  return buildIcs([event], "NYC Insider List");
}

/** Filename-safe slug for the .ics download. */
export function icsFilename(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${slug || "event"}.ics`;
}

/**
 * Google Calendar template URL — true one-tap on web/Android, no download.
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function googleCalendarUrl(event: Event): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title });
  const start = parseEventTime(event.time);
  if (start) {
    const startStr = toIcsDateTime(event.date, start.h, start.m);
    const end = parseEventTime(event.end_time);
    const endStr = end && (end.h > start.h || (end.h === start.h && end.m > start.m))
      ? toIcsDateTime(event.date, end.h, end.m)
      : toIcsDateTime(event.date, Math.min(start.h + 2, 23), start.m);
    params.set("dates", `${startStr}/${endStr}`);
    params.set("ctz", TZID);
  } else {
    const day = event.date.replace(/-/g, "");
    const next = new Date(`${event.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const nextDay = next.toISOString().slice(0, 10).replace(/-/g, "");
    params.set("dates", `${day}/${nextDay}`);
  }
  const details: string[] = [];
  if (event.description) details.push(event.description.slice(0, 300));
  if (event.url) details.push(`Tickets: ${event.url}`);
  if (details.length) params.set("details", details.join("\n\n"));
  const location = [event.venue, event.address].filter(Boolean).join(", ");
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
