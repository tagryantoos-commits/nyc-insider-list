import type { Event } from "@/lib/types";
import { format, addDays } from "date-fns";

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");
const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");
const nextWeekStr = format(addDays(today, 8), "yyyy-MM-dd");
const nextMonthStr = format(addDays(today, 30), "yyyy-MM-dd");

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: crypto.randomUUID(),
    title: "Test Event",
    date: todayStr,
    time: "7:00 PM",
    end_time: null,
    venue: "Test Venue",
    address: "123 Test St",
    neighborhood: "Midtown",
    category: "Concert",
    cost: "$50",
    is_free: false,
    url: "https://example.com/event",
    description: "A great event description",
    source: "test",
    borough: "Manhattan",
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Today's events (within free tier)
export const todayEvent = makeEvent({
  id: "today-1",
  title: "Jazz at Blue Note",
  date: todayStr,
  time: "8:00 PM",
  venue: "Blue Note Jazz Club",
  category: "Concert",
  cost: "$35",
});

export const todayFreeEvent = makeEvent({
  id: "today-free",
  title: "Free Museum Night",
  date: todayStr,
  time: "6:00 PM",
  venue: "MoMA",
  category: "Museum",
  cost: null,
  is_free: true,
});

export const todaySoldOutEvent = makeEvent({
  id: "today-soldout",
  title: "Hamilton (SOLD OUT)",
  date: todayStr,
  time: "7:00 PM",
  venue: "Richard Rodgers Theatre",
  category: "Broadway",
  cost: "$200",
});

export const tomorrowEvent = makeEvent({
  id: "tomorrow-1",
  title: "Rooftop Party",
  date: tomorrowStr,
  time: "9:00 PM",
  venue: "230 Fifth Rooftop",
  neighborhood: "Flatiron",
  category: "Rooftop",
  cost: "$25+",
});

// Featured/insider pick event
export const featuredEvent = makeEvent({
  id: "featured-1",
  title: "Governors Ball 2026",
  date: tomorrowStr,
  time: "12:00 PM",
  venue: "Flushing Meadows",
  neighborhood: "Queens",
  borough: "Queens",
  category: "Festival",
  cost: "$150",
  is_featured: true,
});

// Gated events (7+ days out)
export const gatedEvent = makeEvent({
  id: "gated-1",
  title: "Future Concert at MSG",
  date: nextWeekStr,
  time: "8:00 PM",
  venue: "Madison Square Garden",
  category: "Concert",
  cost: "$89",
});

export const gatedFreeEvent = makeEvent({
  id: "gated-free",
  title: "Shakespeare in the Park",
  date: nextMonthStr,
  time: "8:00 PM",
  venue: "Delacorte Theater",
  category: "Festival",
  cost: null,
  is_free: true,
});

// Brooklyn event (for borough filtering)
export const brooklynEvent = makeEvent({
  id: "brooklyn-1",
  title: "Brooklyn Mirage Opening",
  date: tomorrowStr,
  time: "10:00 PM",
  venue: "Brooklyn Mirage",
  neighborhood: "East Williamsburg",
  borough: "Brooklyn",
  category: "Concert",
  cost: "$45",
});

// All test events
export const allTestEvents: Event[] = [
  todayEvent,
  todayFreeEvent,
  todaySoldOutEvent,
  tomorrowEvent,
  featuredEvent,
  gatedEvent,
  gatedFreeEvent,
  brooklynEvent,
];

export { todayStr, tomorrowStr, nextWeekStr, nextMonthStr };
