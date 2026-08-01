import type { Event, HappyHour } from "./types";
import { parseEventTime } from "./ics";

/**
 * Plan My Day engine — turns today's events + happy hours into a
 * time-blocked itinerary matched to mood, duration, and group.
 *
 * Pure module: callers fetch data, this selects and sequences it.
 */

export type Mood =
  | "live-music"
  | "comedy-shows"
  | "arts-culture"
  | "food-drink"
  | "outdoors"
  | "family-fun"
  | "free-stuff"
  | "surprise-me";

export type Duration = "few-hours" | "half-day" | "full-day";
export type Group = "just-me" | "date-night" | "family" | "friends";

export interface PlanOptions {
  moods: Mood[];
  duration: Duration;
  group: Group;
  /** Shuffle seed — same seed, same plan (shareable URLs stay stable) */
  seed?: number;
  /** true = skip outdoor-heavy picks */
  badWeather?: boolean;
}

export interface PlanBlock {
  timeLabel: string;
  emoji: string;
  title: string;
  subtitle: string;
  blockType: "event" | "happy-hour" | "attraction";
  href: string | null;
  eventId: string | null;
  isFree: boolean;
}

export interface DayPlan {
  blocks: PlanBlock[];
  weatherNote: string | null;
}

export const MOODS: { key: Mood; label: string; emoji: string }[] = [
  { key: "live-music", label: "Live Music", emoji: "🎸" },
  { key: "comedy-shows", label: "Comedy & Shows", emoji: "🎭" },
  { key: "arts-culture", label: "Arts & Culture", emoji: "🎨" },
  { key: "food-drink", label: "Food & Drink", emoji: "🍸" },
  { key: "outdoors", label: "Outdoors", emoji: "🌳" },
  { key: "family-fun", label: "Family Fun", emoji: "🎪" },
  { key: "free-stuff", label: "Free Stuff", emoji: "🤑" },
  { key: "surprise-me", label: "Surprise Me", emoji: "🎲" },
];

const MOOD_CATEGORIES: Record<Mood, string[]> = {
  "live-music": ["Concert"],
  "comedy-shows": ["Comedy", "Broadway"],
  "arts-culture": ["Museum", "Broadway", "Film"],
  "food-drink": ["Festival", "Rooftop"],
  outdoors: ["Rooftop", "Festival", "Free Event"],
  "family-fun": ["Kid-Friendly", "Museum", "Sports"],
  "free-stuff": ["Free Event", "Museum"],
  "surprise-me": [],
};

const OUTDOOR_CATEGORIES = new Set(["Rooftop", "Festival"]);

// Evergreen NYC fallbacks for slots no event fills
interface Attraction {
  title: string;
  subtitle: string;
  emoji: string;
  slots: Slot[];
  moods: Mood[];
  isOutdoor: boolean;
  isFree: boolean;
  href: string | null;
}

const ATTRACTIONS: Attraction[] = [
  { title: "Walk the High Line", subtitle: "Gansevoort St to 34th St, Chelsea", emoji: "🌿", slots: ["morning", "afternoon"], moods: ["outdoors", "free-stuff", "surprise-me"], isOutdoor: true, isFree: true, href: "https://www.thehighline.org" },
  { title: "Central Park loop + Bethesda Terrace", subtitle: "Enter at 72nd St", emoji: "🌳", slots: ["morning", "afternoon"], moods: ["outdoors", "family-fun", "free-stuff", "surprise-me"], isOutdoor: true, isFree: true, href: "https://www.centralparknyc.org" },
  { title: "The Met", subtitle: "1000 Fifth Ave, Upper East Side", emoji: "🏛️", slots: ["morning", "afternoon"], moods: ["arts-culture", "surprise-me"], isOutdoor: false, isFree: false, href: "https://www.metmuseum.org" },
  { title: "MoMA", subtitle: "11 W 53rd St, Midtown", emoji: "🎨", slots: ["morning", "afternoon"], moods: ["arts-culture", "surprise-me"], isOutdoor: false, isFree: false, href: "https://www.moma.org" },
  { title: "Brooklyn Bridge walk at sunset", subtitle: "Start from City Hall side", emoji: "🌉", slots: ["evening"], moods: ["outdoors", "free-stuff", "surprise-me"], isOutdoor: true, isFree: true, href: null },
  { title: "DUMBO waterfront + Time Out Market", subtitle: "Brooklyn Bridge Park", emoji: "🗽", slots: ["afternoon", "evening"], moods: ["food-drink", "outdoors", "surprise-me"], isOutdoor: true, isFree: true, href: "https://www.timeoutmarket.com/newyork" },
  { title: "Chelsea Market grazing", subtitle: "75 9th Ave, Chelsea", emoji: "🥟", slots: ["lunch", "afternoon"], moods: ["food-drink", "family-fun", "surprise-me"], isOutdoor: false, isFree: false, href: "https://www.chelseamarket.com" },
  { title: "Comedy Cellar (walk-in line)", subtitle: "117 MacDougal St, Greenwich Village", emoji: "🎤", slots: ["late-night"], moods: ["comedy-shows", "surprise-me"], isOutdoor: false, isFree: false, href: "https://www.comedycellar.com" },
  { title: "Jazz at Smalls", subtitle: "183 W 10th St, West Village", emoji: "🎷", slots: ["late-night"], moods: ["live-music", "surprise-me"], isOutdoor: false, isFree: false, href: "https://www.smallslive.com" },
  { title: "American Museum of Natural History", subtitle: "200 Central Park West", emoji: "🦕", slots: ["morning", "afternoon"], moods: ["family-fun", "arts-culture", "surprise-me"], isOutdoor: false, isFree: false, href: "https://www.amnh.org" },
];

type Slot = "morning" | "lunch" | "afternoon" | "happy-hour" | "evening" | "late-night";

const SLOT_DEFS: { slot: Slot; label: string; startHour: number; endHour: number }[] = [
  { slot: "morning", label: "10:00 AM", startHour: 6, endHour: 12 },
  { slot: "lunch", label: "12:30 PM", startHour: 12, endHour: 14 },
  { slot: "afternoon", label: "2:30 PM", startHour: 12, endHour: 17 },
  { slot: "happy-hour", label: "5:30 PM", startHour: 16, endHour: 19 },
  { slot: "evening", label: "8:00 PM", startHour: 17, endHour: 23 },
  { slot: "late-night", label: "10:30 PM", startHour: 21, endHour: 28 }, // NYC runs late
];

const DURATION_SLOTS: Record<Duration, Slot[]> = {
  "few-hours": ["happy-hour", "evening"],
  "half-day": ["afternoon", "happy-hour", "evening"],
  "full-day": ["morning", "lunch", "afternoon", "happy-hour", "evening", "late-night"],
};

const GROUP_VIBES: Record<Group, string[]> = {
  "just-me": ["dive_bar", "pub", "cocktail_lounge", "wine_bar"],
  "date-night": ["cocktail_lounge", "wine_bar", "speakeasy", "rooftop", "hotel_bar"],
  family: [], // families skip the happy hour slot
  friends: ["beer_garden", "sports_bar", "pub", "rooftop", "tiki_bar"],
};

const CATEGORY_EMOJI: Record<string, string> = {
  Rooftop: "🍹",
  Broadway: "🎭",
  Concert: "🎸",
  Museum: "🏛️",
  Festival: "🎪",
  "Free Event": "🤑",
  "Kid-Friendly": "🎈",
  Comedy: "🎤",
  Sports: "🏟️",
  Film: "🎬",
  Other: "✨",
};

/** Deterministic PRNG so a shared plan URL re-renders identically. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scoreEvent(event: Event, options: PlanOptions): number {
  let score = 10;
  const moods = options.moods.length ? options.moods : ["surprise-me" as Mood];
  const isSurprise = moods.includes("surprise-me");

  for (const mood of moods) {
    if (MOOD_CATEGORIES[mood]?.includes(event.category)) score += 30;
  }
  if (isSurprise) score += 10; // everything qualifies a bit

  if (event.is_free) score += moods.includes("free-stuff") ? 40 : 15;
  if (event.is_featured) score += 20;
  if (options.group === "family" && event.category === "Kid-Friendly") score += 35;
  if (options.group === "date-night" && ["Rooftop", "Broadway", "Concert"].includes(event.category)) score += 10;
  if (options.badWeather && OUTDOOR_CATEGORIES.has(event.category)) score -= 40;

  // Junk guard: absurdly long titles are scraper noise
  if (event.title.length > 120) score -= 100;
  return score;
}

function eventHour(event: Event): number | null {
  const t = parseEventTime(event.time);
  if (!t) return null;
  // Treat early-AM times (before 6) as late-night extensions of the day
  return t.h < 6 ? t.h + 24 : t.h;
}

function fitsSlot(event: Event, slot: Slot): boolean {
  const def = SLOT_DEFS.find((d) => d.slot === slot)!;
  const hour = eventHour(event);
  if (hour === null) {
    // Untimed events can fill daytime slots only
    return slot === "morning" || slot === "afternoon";
  }
  return hour >= def.startHour && hour < def.endHour;
}

function pickWeighted<T>(items: T[], rand: () => number, topN = 3): T | null {
  if (!items.length) return null;
  const pool = items.slice(0, Math.max(1, Math.min(topN, items.length)));
  return pool[Math.floor(rand() * pool.length)];
}

function todayDayName(now: Date): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
}

export function buildDayPlan(
  events: Event[],
  happyHours: HappyHour[],
  options: PlanOptions,
  now: Date = new Date(),
): DayPlan {
  const rand = mulberry32(options.seed ?? 1);
  const currentHour = now.getHours();
  const usedEventIds = new Set<string>();
  const usedTitles = new Set<string>();
  const blocks: PlanBlock[] = [];

  const scored = events
    .map((e) => ({ event: e, score: scoreEvent(e, options) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const slots = DURATION_SLOTS[options.duration].filter((slot) => {
    const def = SLOT_DEFS.find((d) => d.slot === slot)!;
    return def.endHour > currentHour; // don't plan the past
  });

  for (const slot of slots) {
    const def = SLOT_DEFS.find((d) => d.slot === slot)!;

    // Happy hour slot pulls from the happy_hours dataset
    if (slot === "happy-hour") {
      if (options.group === "family") continue;
      const dayName = todayDayName(now);
      const vibes = GROUP_VIBES[options.group];
      const candidates = happyHours
        .filter((h) => h.is_active && h.days?.includes(dayName))
        .filter((h) => !options.badWeather || !h.has_outdoor_seating || h.vibe !== "rooftop")
        .sort((a, b) => {
          const aVibe = vibes.includes(a.vibe ?? "") ? 1 : 0;
          const bVibe = vibes.includes(b.vibe ?? "") ? 1 : 0;
          if (aVibe !== bVibe) return bVibe - aVibe;
          return (b.quality_score ?? 0) - (a.quality_score ?? 0);
        });
      const pick = pickWeighted(candidates, rand, 8);
      if (pick) {
        blocks.push({
          timeLabel: def.label,
          emoji: "🍻",
          title: `Happy hour at ${pick.name}`,
          subtitle: [pick.neighborhood, pick.drink_specials].filter(Boolean).join(" · ").slice(0, 90) || pick.borough,
          blockType: "happy-hour",
          href: pick.website_url ?? pick.google_maps_url,
          eventId: null,
          isFree: false,
        });
      }
      continue;
    }

    // Event slots: best-scoring unused event that fits the window
    const candidates = scored.filter(
      (s) =>
        !usedEventIds.has(s.event.id) &&
        !usedTitles.has(s.event.title) &&
        fitsSlot(s.event, slot),
    );
    const pick = pickWeighted(candidates, rand, slot === "evening" ? 4 : 3);

    if (pick) {
      usedEventIds.add(pick.event.id);
      usedTitles.add(pick.event.title);
      const subtitleParts = [pick.event.time, pick.event.venue ?? pick.event.neighborhood].filter(Boolean);
      blocks.push({
        timeLabel: pick.event.time ?? def.label,
        emoji: CATEGORY_EMOJI[pick.event.category] ?? "✨",
        title: pick.event.title,
        subtitle: subtitleParts.join(" · "),
        blockType: "event",
        href: `/events/${pick.event.id}`,
        eventId: pick.event.id,
        isFree: pick.event.is_free,
      });
      continue;
    }

    // Fallback attraction (never for lunch — skipping lunch beats padding it)
    if (slot === "lunch") continue;
    const moods = options.moods.length ? options.moods : (["surprise-me"] as Mood[]);
    const attractions = ATTRACTIONS.filter(
      (a) =>
        a.slots.includes(slot) &&
        !usedTitles.has(a.title) &&
        (!options.badWeather || !a.isOutdoor) &&
        (moods.includes("surprise-me") || a.moods.some((m) => moods.includes(m))),
    );
    const fallback = pickWeighted(attractions, rand, 3);
    if (fallback) {
      usedTitles.add(fallback.title);
      blocks.push({
        timeLabel: def.label,
        emoji: fallback.emoji,
        title: fallback.title,
        subtitle: fallback.subtitle,
        blockType: "attraction",
        href: fallback.href,
        eventId: null,
        isFree: fallback.isFree,
      });
    }
  }

  return {
    blocks,
    weatherNote: options.badWeather
      ? "Rain in the forecast — we kept things indoors."
      : null,
  };
}
