import {
  escapeIcsText,
  foldIcsLine,
  parseEventTime,
  buildSingleEventIcs,
  buildIcs,
  icsFilename,
  googleCalendarUrl,
} from "@/lib/ics";
import { buildDayPlan, scoreEvent, type PlanOptions } from "@/lib/plan-my-day";
import { generatePlanSlug, isValidSlug, isValidRsvpResponse, isPlanExpired } from "@/lib/plans";
import { makeEvent } from "./fixtures";
import type { HappyHour } from "@/lib/types";

// ─── ICS builder ──────────────────────────────────────────

describe("escapeIcsText", () => {
  test("escapes RFC 5545 special characters", () => {
    expect(escapeIcsText("a;b,c\\d")).toBe("a\\;b\\,c\\\\d");
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
    expect(escapeIcsText("line1\r\nline2")).toBe("line1\\nline2");
  });
});

describe("foldIcsLine", () => {
  test("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  test("folds long lines with CRLF + space", () => {
    const long = "SUMMARY:" + "x".repeat(200);
    const folded = foldIcsLine(long);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBe(75);
    lines.slice(1).forEach((l) => {
      expect(l.startsWith(" ")).toBe(true);
      expect(l.length).toBeLessThanOrEqual(75);
    });
    // Reassembling (strip continuation spaces) recovers the original
    expect(lines[0] + lines.slice(1).map((l) => l.slice(1)).join("")).toBe(long);
  });
});

describe("parseEventTime", () => {
  test("parses standard times", () => {
    expect(parseEventTime("7:00 PM")).toEqual({ h: 19, m: 0 });
    expect(parseEventTime("11:05 AM")).toEqual({ h: 11, m: 5 });
    expect(parseEventTime("12:00 PM")).toEqual({ h: 12, m: 0 }); // noon
    expect(parseEventTime("12:30 AM")).toEqual({ h: 0, m: 30 }); // after midnight
  });

  test("rejects garbage", () => {
    expect(parseEventTime(null)).toBeNull();
    expect(parseEventTime("TBD")).toBeNull();
    expect(parseEventTime("25:00 PM")).toBeNull();
  });
});

describe("buildSingleEventIcs", () => {
  const event = makeEvent({
    id: "12345678-1234-1234-1234-123456789012",
    title: "Jazz Night; with, specials",
    date: "2026-08-15",
    time: "7:00 PM",
    venue: "Blue Note",
    address: "131 W 3rd St",
  });

  test("produces a valid VCALENDAR wrapper", () => {
    const ics = buildSingleEventIcs(event);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("TZID:America/New_York");
    expect(ics).toContain("BEGIN:VEVENT");
  });

  test("renders timed event with TZID and 2h default duration", () => {
    const ics = buildSingleEventIcs(event);
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260815T190000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260815T210000");
  });

  test("escapes special characters in summary", () => {
    const ics = buildSingleEventIcs(event);
    expect(ics).toContain("Jazz Night\\; with\\, specials");
  });

  test("renders untimed event as all-day", () => {
    const ics = buildSingleEventIcs(makeEvent({ id: "12345678-1234-1234-1234-123456789013", date: "2026-08-15", time: null }));
    expect(ics).toContain("DTSTART;VALUE=DATE:20260815");
  });

  test("respects explicit end_time when after start", () => {
    const ics = buildSingleEventIcs(
      makeEvent({ id: "12345678-1234-1234-1234-123456789014", date: "2026-08-15", time: "7:00 PM", end_time: "11:00 PM" }),
    );
    expect(ics).toContain("DTEND;TZID=America/New_York:20260815T230000");
  });

  test("multi-event calendar contains one VEVENT per event", () => {
    const ics = buildIcs([event, makeEvent({ id: "12345678-1234-1234-1234-123456789015" })]);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
  });
});

describe("icsFilename", () => {
  test("slugifies titles", () => {
    expect(icsFilename("Jazz Night @ Blue Note!")).toBe("jazz-night-blue-note.ics");
    expect(icsFilename("???")).toBe("event.ics");
  });
});

describe("googleCalendarUrl", () => {
  test("builds a template URL with dates and timezone", () => {
    const url = googleCalendarUrl(
      makeEvent({ id: "12345678-1234-1234-1234-123456789016", title: "Show", date: "2026-08-15", time: "7:00 PM" }),
    );
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("20260815T190000%2F20260815T210000");
    expect(url).toContain("ctz=America%2FNew_York");
  });

  test("all-day event spans one day", () => {
    const url = googleCalendarUrl(
      makeEvent({ id: "12345678-1234-1234-1234-123456789017", date: "2026-08-15", time: null }),
    );
    expect(url).toContain("dates=20260815%2F20260816");
  });
});

// ─── Plan My Day engine ───────────────────────────────────

const baseOptions: PlanOptions = {
  moods: ["live-music"],
  duration: "full-day",
  group: "just-me",
  seed: 1,
};

function todayEventAt(time: string, overrides = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return makeEvent({ id: crypto.randomUUID(), date: today, time, ...overrides });
}

const makeHH = (overrides: Partial<HappyHour> = {}): HappyHour => ({
  id: crypto.randomUUID(),
  name: "Test Bar",
  address: null,
  neighborhood: "East Village",
  borough: "Manhattan",
  latitude: null,
  longitude: null,
  cuisine_type: null,
  vibe: "pub",
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  start_time: "4:00 PM",
  end_time: "7:00 PM",
  has_late_night_happy_hour: false,
  late_night_start: null,
  late_night_end: null,
  drink_specials: "$8 martinis",
  food_specials: null,
  has_food_specials: false,
  price_tier: null,
  has_live_music: false,
  music_details: null,
  has_entertainment: false,
  entertainment_details: null,
  has_outdoor_seating: false,
  outdoor_type: null,
  seating_type: null,
  reservations: null,
  website_url: "https://example.com",
  instagram_handle: null,
  google_maps_url: null,
  is_hotel_bar: false,
  source: null,
  quality_score: 8,
  is_active: true,
  ...overrides,
});

describe("scoreEvent", () => {
  test("mood category match beats non-match", () => {
    const concert = makeEvent({ id: crypto.randomUUID(), category: "Concert" });
    const museum = makeEvent({ id: crypto.randomUUID(), category: "Museum" });
    expect(scoreEvent(concert, baseOptions)).toBeGreaterThan(scoreEvent(museum, baseOptions));
  });

  test("free events get a boost, bigger with free-stuff mood", () => {
    const free = makeEvent({ id: crypto.randomUUID(), category: "Concert", is_free: true });
    const paid = makeEvent({ id: crypto.randomUUID(), category: "Concert", is_free: false });
    expect(scoreEvent(free, baseOptions)).toBeGreaterThan(scoreEvent(paid, baseOptions));
    const freeStuffOptions = { ...baseOptions, moods: ["free-stuff" as const] };
    expect(scoreEvent(free, freeStuffOptions) - scoreEvent(paid, freeStuffOptions)).toBeGreaterThanOrEqual(40);
  });

  test("bad weather penalizes outdoor categories", () => {
    const rooftop = makeEvent({ id: crypto.randomUUID(), category: "Rooftop" });
    expect(scoreEvent(rooftop, { ...baseOptions, badWeather: true })).toBeLessThan(
      scoreEvent(rooftop, baseOptions),
    );
  });

  test("junk titles are buried", () => {
    const junk = makeEvent({ id: crypto.randomUUID(), title: "x".repeat(130) });
    expect(scoreEvent(junk, baseOptions)).toBeLessThan(0);
  });
});

describe("buildDayPlan", () => {
  const morning = new Date();
  morning.setHours(8, 0, 0, 0);

  test("builds a full-day timeline from morning", () => {
    const events = [
      todayEventAt("10:00 AM", { category: "Museum" }),
      todayEventAt("2:00 PM", { category: "Concert" }),
      todayEventAt("8:00 PM", { category: "Concert" }),
    ];
    const plan = buildDayPlan(events, [makeHH()], { ...baseOptions, moods: ["surprise-me"] }, morning);
    expect(plan.blocks.length).toBeGreaterThanOrEqual(3);
    const types = plan.blocks.map((b) => b.blockType);
    expect(types).toContain("event");
    expect(types).toContain("happy-hour");
  });

  test("never plans slots already in the past", () => {
    const evening = new Date();
    evening.setHours(20, 0, 0, 0);
    const plan = buildDayPlan(
      [todayEventAt("10:00 AM"), todayEventAt("9:00 PM", { category: "Concert" })],
      [makeHH()],
      baseOptions,
      evening,
    );
    // Morning/lunch/afternoon/happy-hour slots are gone by 8 PM
    expect(plan.blocks.every((b) => b.blockType !== "happy-hour")).toBe(true);
    expect(plan.blocks.find((b) => b.title.includes("10:00"))).toBeUndefined();
  });

  test("family group skips the happy hour slot", () => {
    const plan = buildDayPlan(
      [todayEventAt("11:00 AM", { category: "Kid-Friendly" })],
      [makeHH()],
      { ...baseOptions, group: "family", moods: ["family-fun"] },
      morning,
    );
    expect(plan.blocks.every((b) => b.blockType !== "happy-hour")).toBe(true);
  });

  test("same seed produces the same plan (shareable URLs)", () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      todayEventAt(`${(i % 8) + 1}:00 PM`, { category: i % 2 ? "Concert" : "Comedy" }),
    );
    const a = buildDayPlan(events, [makeHH()], { ...baseOptions, seed: 7 }, morning);
    const b = buildDayPlan(events, [makeHH()], { ...baseOptions, seed: 7 }, morning);
    expect(a.blocks.map((x) => x.title)).toEqual(b.blocks.map((x) => x.title));
  });

  test("falls back to attractions when no events exist", () => {
    const plan = buildDayPlan([], [], { ...baseOptions, moods: ["outdoors"] }, morning);
    expect(plan.blocks.length).toBeGreaterThan(0);
    expect(plan.blocks.every((b) => b.blockType === "attraction")).toBe(true);
  });

  test("bad weather adds a note and avoids outdoor attractions", () => {
    const plan = buildDayPlan([], [], { ...baseOptions, moods: ["outdoors"], badWeather: true }, morning);
    expect(plan.weatherNote).toBeTruthy();
    expect(plan.blocks.every((b) => !b.title.includes("High Line"))).toBe(true);
  });

  test("no duplicate events across slots", () => {
    const only = todayEventAt("1:00 PM", { category: "Concert" });
    const plan = buildDayPlan([only], [], { ...baseOptions, moods: ["live-music"] }, morning);
    const eventBlocks = plan.blocks.filter((b) => b.eventId === only.id);
    expect(eventBlocks.length).toBe(1);
  });
});

// ─── Shared plan helpers ──────────────────────────────────

describe("plan slugs", () => {
  test("generates valid 6-char slugs without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generatePlanSlug();
      expect(isValidSlug(slug)).toBe(true);
      expect(slug).not.toMatch(/[01loi]/);
    }
  });

  test("rejects bad slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("abc")).toBe(false);
    expect(isValidSlug("ABCDEF")).toBe(false);
    expect(isValidSlug("abc de")).toBe(false);
    expect(isValidSlug("../../x")).toBe(false);
  });
});

describe("rsvp validation", () => {
  test("accepts only in/maybe/out", () => {
    expect(isValidRsvpResponse("in")).toBe(true);
    expect(isValidRsvpResponse("maybe")).toBe(true);
    expect(isValidRsvpResponse("out")).toBe(true);
    expect(isValidRsvpResponse("yes")).toBe(false);
    expect(isValidRsvpResponse(1)).toBe(false);
    expect(isValidRsvpResponse(null)).toBe(false);
  });
});

describe("plan expiry", () => {
  test("expired vs live", () => {
    expect(isPlanExpired({ expires_at: new Date(Date.now() - 1000).toISOString() })).toBe(true);
    expect(isPlanExpired({ expires_at: new Date(Date.now() + 86400000).toISOString() })).toBe(false);
  });
});
