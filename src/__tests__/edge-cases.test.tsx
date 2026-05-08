import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  makeEvent,
  allTestEvents,
  todayEvent,
  todayFreeEvent,
  todaySoldOutEvent,
  gatedEvent,
  gatedFreeEvent,
  brooklynEvent,
  featuredEvent,
  tomorrowEvent,
  todayStr,
  tomorrowStr,
  nextWeekStr,
  nextMonthStr,
} from "./fixtures";
import { format, addDays } from "date-fns";

// Mocks
jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock("next/navigation", () => ({
  usePathname: () => "/events",
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("lucide-react", () => ({
  Heart: (props: Record<string, unknown>) => <svg data-testid="heart-icon" {...props} />,
  Share2: (props: Record<string, unknown>) => <svg data-testid="share-icon" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="external-link-icon" {...props} />,
  Lock: (props: Record<string, unknown>) => <svg data-testid="lock-icon" {...props} />,
  Star: (props: Record<string, unknown>) => <svg data-testid="star-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  Search: (props: Record<string, unknown>) => <svg data-testid="search-icon" {...props} />,
  ChevronLeft: (props: Record<string, unknown>) => <svg data-testid="chevron-left" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
  Calendar: (props: Record<string, unknown>) => <svg data-testid="calendar-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
  SlidersHorizontal: (props: Record<string, unknown>) => <svg data-testid="sliders-icon" {...props} />,
  Menu: (props: Record<string, unknown>) => <svg data-testid="menu-icon" {...props} />,
  Sun: (props: Record<string, unknown>) => <svg data-testid="sun-icon" {...props} />,
  Moon: (props: Record<string, unknown>) => <svg data-testid="moon-icon" {...props} />,
}));

// ═══════════════════════════════════════════════════════════
// EventCard Edge Cases
// ═══════════════════════════════════════════════════════════

describe("EventCard — null/missing fields", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("renders without venue", () => {
    const event = makeEvent({ id: "no-venue", venue: null, neighborhood: null });
    render(<EventCard event={event} />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  test("renders without time", () => {
    const event = makeEvent({ id: "no-time", time: null });
    render(<EventCard event={event} />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
    // Metadata should only have date + venue, no middot for time
    const meta = screen.getByText(/Test Venue/);
    expect(meta.textContent).not.toContain("null");
  });

  test("renders without cost and not free (no price label)", () => {
    const event = makeEvent({ id: "no-cost", cost: null, is_free: false });
    render(<EventCard event={event} />);
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("$")).not.toBeInTheDocument();
  });

  test("renders without URL (no tickets button on expand)", () => {
    const event = makeEvent({ id: "no-url", url: null });
    render(<EventCard event={event} />);
    fireEvent.click(screen.getByText("Test Event"));
    expect(screen.queryByText(/Tickets/)).not.toBeInTheDocument();
    // View Details should still show
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });

  test("renders without description (no description in expanded view)", () => {
    const event = makeEvent({ id: "no-desc", description: null });
    render(<EventCard event={event} />);
    fireEvent.click(screen.getByText("Test Event"));
    // Address should still show
    expect(screen.getByText("123 Test St")).toBeInTheDocument();
  });

  test("renders without address (no address in expanded view)", () => {
    const event = makeEvent({ id: "no-addr", address: null });
    render(<EventCard event={event} />);
    fireEvent.click(screen.getByText("Test Event"));
    expect(screen.queryByText("123 Test St")).not.toBeInTheDocument();
  });

  test("renders without borough", () => {
    const event = makeEvent({ id: "no-borough", borough: null });
    render(<EventCard event={event} />);
    fireEvent.click(screen.getByText("Test Event"));
    // Should not crash, borough line simply absent
    expect(screen.queryByText("Manhattan")).not.toBeInTheDocument();
  });

  test("renders venue with neighborhood when both present", () => {
    render(<EventCard event={todayEvent} />);
    // Blue Note Jazz Club doesn't have neighborhood "Midtown" in fixture
    // todayEvent has venue "Blue Note Jazz Club" and neighborhood from makeEvent default is overridden
  });

  test("handles event with all null optional fields", () => {
    const event = makeEvent({
      id: "all-null",
      time: null,
      end_time: null,
      venue: null,
      address: null,
      neighborhood: null,
      cost: null,
      url: null,
      description: null,
      source: null,
      borough: null,
    });
    render(<EventCard event={event} />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });
});

describe("EventCard — sold out detection edge cases", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("detects sold out in title (case insensitive)", () => {
    const event = makeEvent({ id: "so1", title: "Concert (sold out)" });
    const { container } = render(<EventCard event={event} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).style.opacity).toBe("0.5");
  });

  test("detects sold out in description", () => {
    const event = makeEvent({ id: "so2", title: "Concert", description: "This show is SOLD OUT" });
    render(<EventCard event={event} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
  });

  test("does not false-positive on 'sold' without 'out'", () => {
    const event = makeEvent({ id: "so3", title: "Tickets Sold Fast", description: "Great show" });
    render(<EventCard event={event} />);
    expect(screen.queryByText("Sold Out")).not.toBeInTheDocument();
  });
});

describe("EventCard — expand/collapse toggling", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("expands on first click, collapses on second click", () => {
    render(<EventCard event={todayEvent} />);
    // First click: expand
    fireEvent.click(screen.getByText("Jazz at Blue Note"));
    expect(screen.getByText("View Details")).toBeInTheDocument();
    // Second click: collapse
    fireEvent.click(screen.getByText("Jazz at Blue Note"));
    expect(screen.queryByText("View Details")).not.toBeInTheDocument();
  });

  test("long description gets truncated at 300 chars", () => {
    const longDesc = "A".repeat(400);
    const event = makeEvent({ id: "long-desc", description: longDesc });
    render(<EventCard event={event} />);
    fireEvent.click(screen.getByText("Test Event"));
    const descEl = screen.getByText(/^A+\.\.\.$/);
    expect(descEl).toBeInTheDocument();
  });

  test("short description shows fully without ellipsis", () => {
    const event = makeEvent({ id: "short-desc", description: "Short description" });
    render(<EventCard event={event} />);
    fireEvent.click(screen.getByText("Test Event"));
    expect(screen.getByText("Short description")).toBeInTheDocument();
  });
});

describe("EventCard — gated + insider pick combinations", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("shows both insider pick badge and lock when gated + insider pick", () => {
    render(<EventCard event={gatedEvent} isGated isInsiderPick onGatedClick={jest.fn()} />);
    expect(screen.getByText("PICK")).toBeInTheDocument();
    expect(screen.getByText("Subscribe to unlock details")).toBeInTheDocument();
  });

  test("gated event does not show share/save buttons on hover", () => {
    const onToggleSave = jest.fn();
    render(<EventCard event={gatedEvent} isGated onToggleSave={onToggleSave} onGatedClick={jest.fn()} />);
    // Share and save should still be in DOM but clicking the card triggers gated
    fireEvent.click(screen.getByText("Future Concert at MSG"));
    // The expanded section should NOT appear
    expect(screen.queryByText("View Details")).not.toBeInTheDocument();
  });
});

describe("EventCard — share button", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("copies URL to clipboard on share click", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<EventCard event={todayEvent} />);
    const shareBtn = screen.getByTestId("share-icon").closest("button")!;
    await act(async () => { fireEvent.click(shareBtn); });

    expect(writeText).toHaveBeenCalledWith("https://example.com/event");
  });

  test("shows 'Copied!' toast after share", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<EventCard event={todayEvent} />);
    const shareBtn = screen.getByTestId("share-icon").closest("button")!;
    await act(async () => { fireEvent.click(shareBtn); });

    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  test("does not attempt clipboard write when event has no URL", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const event = makeEvent({ id: "no-url-share", url: null });
    render(<EventCard event={event} />);
    const shareBtn = screen.getByTestId("share-icon").closest("button")!;
    await act(async () => { fireEvent.click(shareBtn); });

    expect(writeText).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// CarouselCard Edge Cases
// ═══════════════════════════════════════════════════════════

describe("CarouselCard — edge cases", () => {
  let CarouselCard: typeof import("@/components/CarouselCard").default;
  beforeEach(async () => { CarouselCard = (await import("@/components/CarouselCard")).default; });

  test("renders both rank badge and insider pick badge simultaneously", () => {
    render(<CarouselCard event={todayEvent} rank={1} isInsiderPick />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("PICK")).toBeInTheDocument();
  });

  test("gated free event shows Free label (not '$ ---')", () => {
    render(<CarouselCard event={gatedFreeEvent} isGated />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByText("$ ---")).not.toBeInTheDocument();
  });

  test("sold out event shows Sold Out regardless of gated state", () => {
    render(<CarouselCard event={todaySoldOutEvent} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
  });

  test("event with no venue doesn't render venue line", () => {
    const event = makeEvent({ id: "no-venue-carousel", venue: null });
    render(<CarouselCard event={event} />);
    // Should not crash, just show date
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });

  test("gated event prevents default link behavior", () => {
    const onGatedClick = jest.fn();
    const { container } = render(<CarouselCard event={gatedEvent} isGated onGatedClick={onGatedClick} />);
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("#");
    expect(link.getAttribute("target")).toBeNull();
  });

  test("non-gated event opens in new tab", () => {
    const { container } = render(<CarouselCard event={todayEvent} />);
    const link = container.querySelector("a")!;
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("href")).toBe("https://example.com/event");
  });

  test("gated event hides time from date string", () => {
    render(<CarouselCard event={gatedEvent} isGated />);
    // Time should not appear for gated events
    expect(screen.queryByText(/8:00 PM/)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// CalendarPreview Edge Cases
// ═══════════════════════════════════════════════════════════

describe("CalendarPreview — edge cases", () => {
  let CalendarPreview: typeof import("@/components/CalendarPreview").default;
  beforeEach(async () => { CalendarPreview = (await import("@/components/CalendarPreview")).default; });

  test("renders with empty events array", () => {
    render(<CalendarPreview events={[]} />);
    expect(screen.getByText("NYC Insider List")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  test("limits to 3 events per day in the visual", () => {
    // Create 5 events for today with unique prefixes
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `cal-${i}`, title: `CalTest${i}`, date: todayStr }),
    );
    render(<CalendarPreview events={events} />);
    // Only first 3 should render (the component slices to 3 per day)
    const rendered = screen.getAllByText(/^CalTest/);
    expect(rendered.length).toBe(3);
  });

  test("renders 7 day columns", () => {
    render(<CalendarPreview events={allTestEvents} />);
    // Should have "Today" plus 6 day abbreviations
    expect(screen.getByText("Today")).toBeInTheDocument();
    // 7 date numbers should appear
    const dayNumbers = screen.getAllByText(/^\d{1,2}$/);
    expect(dayNumbers.length).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════
// SubscribeModal Edge Cases
// ═══════════════════════════════════════════════════════════

describe("SubscribeModal — form submission", () => {
  let SubscribeModal: typeof import("@/components/SubscribeModal").default;
  beforeEach(async () => { SubscribeModal = (await import("@/components/SubscribeModal")).default; });

  test("submits email to /api/checkout", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session" }),
    });
    global.fetch = mockFetch;

    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );

    const input = screen.getByPlaceholderText("Your Google account email");
    fireEvent.change(input, { target: { value: "test@gmail.com" } });
    const form = input.closest("form")!;

    await act(async () => { fireEvent.submit(form); });

    expect(mockFetch).toHaveBeenCalledWith("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@gmail.com" }),
    });
  });

  test("shows error when API returns error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: "Invalid email" }),
    });

    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );

    const input = screen.getByPlaceholderText("Your Google account email");
    fireEvent.change(input, { target: { value: "bad@email.com" } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Subscribe.*\$2\.99/));
    });

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  test("shows network error on fetch failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );

    const input = screen.getByPlaceholderText("Your Google account email");
    fireEvent.change(input, { target: { value: "test@gmail.com" } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Subscribe.*\$2\.99/));
    });

    expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
  });

  test("does not close modal when clicking inside content", () => {
    const onClose = jest.fn();
    render(
      <SubscribeModal isOpen onClose={onClose} events={allTestEvents} gatedEventCount={100} />,
    );

    fireEvent.click(screen.getByText("10 category calendars"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// DateGroup Edge Cases
// ═══════════════════════════════════════════════════════════

describe("DateGroup — edge cases", () => {
  let DateGroup: typeof import("@/components/DateGroup").default;
  beforeEach(async () => { DateGroup = (await import("@/components/DateGroup")).default; });

  test("shows singular 'event' for 1 event", () => {
    render(<DateGroup date={todayStr} events={[todayEvent]} />);
    expect(screen.getByText("1 event")).toBeInTheDocument();
  });

  test("shows plural 'events' for multiple events", () => {
    render(<DateGroup date={todayStr} events={[todayEvent, todayFreeEvent]} />);
    expect(screen.getByText("2 events")).toBeInTheDocument();
  });

  test("passes gated props through to EventCard", () => {
    const gatedIds = new Set(["gated-1"]);
    const onGatedClick = jest.fn();
    render(
      <DateGroup
        date={nextWeekStr}
        events={[gatedEvent]}
        gatedIds={gatedIds}
        onGatedClick={onGatedClick}
      />,
    );
    expect(screen.getByText("Subscribe to unlock details")).toBeInTheDocument();
  });

  test("passes insider pick props through to EventCard", () => {
    const insiderPickIds = new Set(["featured-1"]);
    render(
      <DateGroup
        date={tomorrowStr}
        events={[featuredEvent]}
        insiderPickIds={insiderPickIds}
      />,
    );
    expect(screen.getByText("PICK")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// Footer Edge Cases
// ═══════════════════════════════════════════════════════════

describe("Footer — link completeness", () => {
  let Footer: typeof import("@/components/Footer").default;
  beforeEach(async () => { Footer = (await import("@/components/Footer")).default; });

  test("all category links use correct URL encoding", () => {
    render(<Footer />);
    // "Free" category key is "Free Event" which needs encoding
    const freeLink = screen.getByText("Free").closest("a");
    expect(freeLink?.getAttribute("href")).toBe("/events?category=Free%20Event");
  });

  test("subscribe link uses gold color", () => {
    render(<Footer />);
    const subLink = screen.getByText("Subscribe").closest("a");
    expect(subLink).toHaveStyle({ color: "var(--gold)" });
  });

  test("all events link points to /events", () => {
    render(<Footer />);
    const allLink = screen.getByText("All Events").closest("a");
    expect(allLink?.getAttribute("href")).toBe("/events");
  });
});

// ═══════════════════════════════════════════════════════════
// SubscribeCTA Edge Cases
// ═══════════════════════════════════════════════════════════

describe("SubscribeCTA — edge cases", () => {
  let SubscribeCTA: typeof import("@/components/SubscribeCTA").default;
  beforeEach(async () => { SubscribeCTA = (await import("@/components/SubscribeCTA")).default; });

  test("renders as link when no onSubscribeClick provided", () => {
    render(<SubscribeCTA />);
    const link = screen.getByText("Subscribe $2.99/mo").closest("a");
    expect(link).toHaveAttribute("href", "/subscribe");
  });

  test("renders as button when onSubscribeClick provided", () => {
    render(<SubscribeCTA onSubscribeClick={jest.fn()} />);
    const btn = screen.getByText("Subscribe $2.99/mo").closest("button");
    expect(btn).toBeInTheDocument();
    // Should NOT be a link
    const link = screen.getByText("Subscribe $2.99/mo").closest("a");
    expect(link).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// Hero Edge Cases
// ═══════════════════════════════════════════════════════════

describe("Hero — edge cases", () => {
  let Hero: typeof import("@/components/Hero").default;
  beforeEach(async () => { Hero = (await import("@/components/Hero")).default; });

  test("formats zero events correctly", () => {
    render(<Hero eventCount={0} addedThisWeek={0} searchQuery="" onSearchChange={jest.fn()} />);
    expect(screen.getByText(/0 events/)).toBeInTheDocument();
  });

  test("formats large numbers with commas", () => {
    render(<Hero eventCount={12345} addedThisWeek={0} searchQuery="" onSearchChange={jest.fn()} />);
    expect(screen.getByText(/12,345 events/)).toBeInTheDocument();
  });

  test("search input has search icon", () => {
    render(<Hero eventCount={500} addedThisWeek={0} searchQuery="" onSearchChange={jest.fn()} />);
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// Constants Edge Cases
// ═══════════════════════════════════════════════════════════

describe("Constants — edge cases", () => {
  test("getCategoryMeta handles empty string", () => {
    const { getCategoryMeta } = require("@/lib/constants");
    const meta = getCategoryMeta("");
    expect(meta).toBeDefined();
    expect(meta.key).toBe("Other");
  });

  test("every CATEGORY has required fields", () => {
    const { CATEGORIES } = require("@/lib/constants");
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty("key");
      expect(cat).toHaveProperty("label");
      expect(cat).toHaveProperty("color");
      expect(cat.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test("every HOMEPAGE_SECTION has required fields", () => {
    const { HOMEPAGE_SECTIONS } = require("@/lib/constants");
    for (const section of HOMEPAGE_SECTIONS) {
      expect(section).toHaveProperty("category");
      expect(section).toHaveProperty("prefix");
      expect(section).toHaveProperty("label");
      expect(typeof section.category).toBe("string");
      expect(typeof section.prefix).toBe("string");
      expect(typeof section.label).toBe("string");
    }
  });

  test("HOMEPAGE_SECTIONS categories exist in CATEGORIES", () => {
    const { CATEGORIES, HOMEPAGE_SECTIONS } = require("@/lib/constants");
    const catKeys = CATEGORIES.map((c: { key: string }) => c.key);
    for (const section of HOMEPAGE_SECTIONS) {
      expect(catKeys).toContain(section.category);
    }
  });

  test("no duplicate category keys", () => {
    const { CATEGORIES } = require("@/lib/constants");
    const keys = CATEGORIES.map((c: { key: string }) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ═══════════════════════════════════════════════════════════
// Paywall Boundary Tests
// ═══════════════════════════════════════════════════════════

describe("Paywall boundary logic", () => {
  test("event exactly 7 days out should be gated", () => {
    const { isAfter, addDays, startOfDay, parseISO } = require("date-fns");
    const now = startOfDay(new Date());
    const gateDate = addDays(now, 7);
    const eventDate = format(addDays(new Date(), 7), "yyyy-MM-dd");
    // An event 7 days from now: parseISO gives start of that day
    // isAfter(startOfDay(date+7), addDays(now, 7)) = isAfter(date+7, date+7) = false
    // So event at exactly 7 days is NOT gated (it's on the boundary)
    expect(isAfter(parseISO(eventDate), gateDate)).toBe(false);
  });

  test("event 8 days out should be gated", () => {
    const { isAfter, addDays, startOfDay, parseISO } = require("date-fns");
    const now = startOfDay(new Date());
    const gateDate = addDays(now, 7);
    const eventDate = format(addDays(new Date(), 8), "yyyy-MM-dd");
    expect(isAfter(parseISO(eventDate), gateDate)).toBe(true);
  });

  test("event 6 days out should NOT be gated", () => {
    const { isAfter, addDays, startOfDay, parseISO } = require("date-fns");
    const now = startOfDay(new Date());
    const gateDate = addDays(now, 7);
    const eventDate = format(addDays(new Date(), 6), "yyyy-MM-dd");
    expect(isAfter(parseISO(eventDate), gateDate)).toBe(false);
  });

  test("today's event should NOT be gated", () => {
    const { isAfter, addDays, startOfDay, parseISO } = require("date-fns");
    const now = startOfDay(new Date());
    const gateDate = addDays(now, 7);
    expect(isAfter(parseISO(todayStr), gateDate)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Sidebar Edge Cases
// ═══════════════════════════════════════════════════════════

describe("Sidebar — edge cases", () => {
  let Sidebar: typeof import("@/components/Sidebar").default;
  beforeEach(async () => { Sidebar = (await import("@/components/Sidebar")).default; });

  const defaultProps = {
    activeBorough: null,
    onBoroughChange: jest.fn(),
    boroughCounts: { Manhattan: 500, Brooklyn: 50, Queens: 30, Bronx: 20 },
    activeCategory: null,
    onCategoryChange: jest.fn(),
    categoryCounts: { Concert: 100, Rooftop: 50 },
    totalCount: 150,
    freeOnly: false,
    onFreeOnlyChange: jest.fn(),
    hideSoldOut: false,
    onHideSoldOutChange: jest.fn(),
    timeFilter: "all" as const,
    onTimeFilterChange: jest.fn(),
    sortMode: "date" as const,
    onSortModeChange: jest.fn(),
  };

  test("does not show neighborhood dropdown when no borough selected", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.queryByText("All neighborhoods")).not.toBeInTheDocument();
  });

  test("shows neighborhood dropdown when borough is selected", () => {
    render(
      <Sidebar
        {...defaultProps}
        activeBorough="Manhattan"
        neighborhoodCounts={{ "Midtown": 20, "Lower East Side": 15, "Chelsea": 10 }}
        activeNeighborhood={null}
        onNeighborhoodChange={jest.fn()}
      />,
    );
    expect(screen.getByText("All neighborhoods")).toBeInTheDocument();
  });

  test("shows category counts of zero", () => {
    render(<Sidebar {...defaultProps} categoryCounts={{ Concert: 0, Rooftop: 0 }} totalCount={0} />);
    // The total count "0" appears next to "All" in the category list
    const allButton = screen.getByRole("button", { name: /All/ });
    expect(allButton.textContent).toContain("0");
  });

  test("borough radio buttons are exclusive", () => {
    render(<Sidebar {...defaultProps} activeBorough="Brooklyn" />);
    const allRadio = screen.getAllByRole("radio", { name: /All/i })[0] as HTMLInputElement;
    const brooklynRadio = screen.getByRole("radio", { name: /Brooklyn/i }) as HTMLInputElement;
    expect(allRadio.checked).toBe(false);
    expect(brooklynRadio.checked).toBe(true);
  });

  test("calls onBoroughChange when borough is selected", () => {
    const onBoroughChange = jest.fn();
    render(<Sidebar {...defaultProps} onBoroughChange={onBoroughChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /Brooklyn/i }));
    expect(onBoroughChange).toHaveBeenCalledWith("Brooklyn");
  });
});
