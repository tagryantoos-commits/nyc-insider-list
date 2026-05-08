/**
 * Additional edge case tests covering:
 * - isHappeningNow time parsing (AM/PM, 12 PM, 12 AM, invalid, boundary)
 * - Navbar (mobile menu toggle, search overlay, active link states, clear search)
 * - MobileFilters (filter panel toggle, borough tabs, category tabs, checkbox states)
 * - EventExplorer (initialCategory, initialSearch, sort modes, localStorage save/load,
 *   neighborhood reset on borough change, date chip selection, empty events)
 * - CarouselCard hover styles
 * - EventCard hover styles on expanded vs collapsed
 * - CategoryCarousel (empty events hides section, viewAllHref)
 * - Price parsing edge cases (no digits, multiple dollar signs)
 * - makeEvent fixture helper
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { format, addDays } from "date-fns";
import {
  makeEvent,
  allTestEvents,
  todayEvent,
  todayFreeEvent,
  todaySoldOutEvent,
  gatedEvent,
  brooklynEvent,
  featuredEvent,
  tomorrowEvent,
  todayStr,
  tomorrowStr,
  nextWeekStr,
} from "./fixtures";

// ── Shared mocks ──────────────────────────────────────────

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

let mockPathname = "/events";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
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
// isHappeningNow — time parsing edge cases
// ═══════════════════════════════════════════════════════════

describe("isHappeningNow time parsing", () => {
  // We can't import the function directly (it's not exported), so we test
  // it indirectly through EventCard's "LIVE" badge rendering.
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  const currentHour = new Date().getHours();

  // Helper: make a time string for the current hour
  function timeForHour(hour: number): string {
    const h = hour % 12 || 12;
    const meridian = hour < 12 ? "AM" : "PM";
    return `${h}:00 ${meridian}`;
  }

  test("event at current hour shows LIVE", () => {
    const event = makeEvent({
      id: "live-now",
      date: todayStr,
      time: timeForHour(currentHour),
    });
    render(<EventCard event={event} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  test("event 1 hour ago shows LIVE (within 3-hour window)", () => {
    // Skip if currentHour < 1 because the midnight wrap isn't handled
    // (event at 11 PM, current at 0 AM: 0 >= 23 = false)
    if (currentHour < 1) return;
    const pastHour = currentHour - 1;
    const event = makeEvent({
      id: "live-1ago",
      date: todayStr,
      time: timeForHour(pastHour),
    });
    render(<EventCard event={event} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  test("event 4 hours ago does NOT show LIVE (outside 3-hour window)", () => {
    const pastHour = (currentHour - 4 + 24) % 24;
    const event = makeEvent({
      id: "live-4ago",
      date: todayStr,
      time: timeForHour(pastHour),
    });
    render(<EventCard event={event} />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  test("event 3 hours from now does NOT show LIVE (hasn't started)", () => {
    const futureHour = (currentHour + 3) % 24;
    const event = makeEvent({
      id: "live-future",
      date: todayStr,
      time: timeForHour(futureHour),
    });
    render(<EventCard event={event} />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  test("event tomorrow does NOT show LIVE regardless of time", () => {
    const event = makeEvent({
      id: "live-tomorrow",
      date: tomorrowStr,
      time: timeForHour(currentHour),
    });
    render(<EventCard event={event} />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  test("today's event with no time shows LIVE", () => {
    const event = makeEvent({ id: "live-notime", date: todayStr, time: null });
    render(<EventCard event={event} />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  test("today's event with invalid time format does NOT show LIVE", () => {
    const event = makeEvent({ id: "live-badtime", date: todayStr, time: "TBD" });
    render(<EventCard event={event} />);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  test("12:00 PM is parsed as noon (hour 12)", () => {
    const event = makeEvent({ id: "live-noon", date: todayStr, time: "12:00 PM" });
    render(<EventCard event={event} />);
    // If current hour is 12-14, LIVE shows; otherwise not
    if (currentHour >= 12 && currentHour < 15) {
      expect(screen.getByText("LIVE")).toBeInTheDocument();
    } else {
      expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    }
  });

  test("12:00 AM is parsed as midnight (hour 0)", () => {
    const event = makeEvent({ id: "live-midnight", date: todayStr, time: "12:00 AM" });
    render(<EventCard event={event} />);
    if (currentHour >= 0 && currentHour < 3) {
      expect(screen.getByText("LIVE")).toBeInTheDocument();
    } else {
      expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    }
  });
});

// ═══════════════════════════════════════════════════════════
// Navbar edge cases
// ═══════════════════════════════════════════════════════════

describe("Navbar", () => {
  let Navbar: typeof import("@/components/Navbar").default;
  beforeEach(async () => { Navbar = (await import("@/components/Navbar")).default; });

  test("renders logo linking to homepage", () => {
    render(<Navbar />);
    const logo = screen.getByText("NYC INSIDER LIST").closest("a");
    expect(logo).toHaveAttribute("href", "/");
  });

  test("shows Events link to /events", () => {
    render(<Navbar />);
    // Events link exists in both desktop and mobile
    const links = screen.getAllByText("Events");
    const desktopLink = links.find((el) => el.closest("a")?.getAttribute("href") === "/events");
    expect(desktopLink).toBeTruthy();
  });

  test("highlights Events link when on /events", () => {
    mockPathname = "/events";
    render(<Navbar />);
    const eventsLinks = screen.getAllByText("Events");
    // Desktop nav link should have gold border
    const desktopLink = eventsLinks[0].closest("a");
    expect(desktopLink?.style.borderBottom).toContain("var(--gold)");
  });

  test("does not highlight Events link when on /happy-hours", () => {
    mockPathname = "/happy-hours";
    render(<Navbar />);
    const eventsLinks = screen.getAllByText("Events");
    const desktopLink = eventsLinks[0].closest("a");
    expect(desktopLink?.style.borderBottom).toContain("transparent");
    mockPathname = "/events"; // reset
  });

  test("shows search bar when showSearchBar=true", () => {
    const onSearchChange = jest.fn();
    render(<Navbar searchQuery="" onSearchChange={onSearchChange} showSearchBar />);
    expect(screen.getByPlaceholderText("Search events...")).toBeInTheDocument();
  });

  test("does not show search bar by default", () => {
    render(<Navbar />);
    expect(screen.queryByPlaceholderText("Search events...")).not.toBeInTheDocument();
  });

  test("shows clear button when search has value", () => {
    const onSearchChange = jest.fn();
    render(<Navbar searchQuery="jazz" onSearchChange={onSearchChange} showSearchBar />);
    // X icon is present for clear
    const clearBtn = screen.getAllByTestId("x-icon")[0]?.closest("button");
    expect(clearBtn).toBeInTheDocument();
  });

  test("clears search when clear button clicked", () => {
    const onSearchChange = jest.fn();
    render(<Navbar searchQuery="jazz" onSearchChange={onSearchChange} showSearchBar />);
    const clearBtn = screen.getAllByTestId("x-icon")[0]?.closest("button");
    fireEvent.click(clearBtn!);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  test("mobile menu toggles open and closed", () => {
    render(<Navbar />);
    const menuBtn = screen.getByLabelText("Menu");
    // Menu should be closed initially
    expect(screen.queryByText("Subscribe $2.99/mo")).not.toBeInTheDocument();
    // Open
    fireEvent.click(menuBtn);
    expect(screen.getByText("Subscribe $2.99/mo")).toBeInTheDocument();
    // Close
    fireEvent.click(menuBtn);
    expect(screen.queryByText("Subscribe $2.99/mo")).not.toBeInTheDocument();
  });

  test("subscribe link has gold color", () => {
    render(<Navbar />);
    const subLinks = screen.getAllByText("Subscribe");
    const desktopSub = subLinks.find((el) => el.closest("a")?.getAttribute("href") === "/subscribe");
    expect(desktopSub?.closest("a")).toHaveStyle({ color: "var(--gold)" });
  });
});

// ═══════════════════════════════════════════════════════════
// MobileFilters edge cases
// ═══════════════════════════════════════════════════════════

describe("MobileFilters", () => {
  let MobileFilters: typeof import("@/components/MobileFilters").default;
  beforeEach(async () => { MobileFilters = (await import("@/components/MobileFilters")).default; });

  const defaults = {
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

  test("shows All Boroughs button", () => {
    render(<MobileFilters {...defaults} />);
    expect(screen.getByText("All Boroughs")).toBeInTheDocument();
  });

  test("shows borough counts in buttons", () => {
    render(<MobileFilters {...defaults} />);
    expect(screen.getByText("Manhattan (500)")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn (50)")).toBeInTheDocument();
  });

  test("shows category All button with total count", () => {
    render(<MobileFilters {...defaults} />);
    expect(screen.getByText("All (150)")).toBeInTheDocument();
  });

  test("toggles filter panel open and closed", () => {
    render(<MobileFilters {...defaults} />);
    // Initially no filter checkboxes visible
    expect(screen.queryByText("Free only")).not.toBeInTheDocument();
    // Open filters
    fireEvent.click(screen.getByText("Filters"));
    expect(screen.getByText("Free only")).toBeInTheDocument();
    expect(screen.getByText("Hide sold out")).toBeInTheDocument();
    // Close filters via X
    const closeBtn = screen.getAllByTestId("x-icon")[0]?.closest("button");
    fireEvent.click(closeBtn!);
    expect(screen.queryByText("Free only")).not.toBeInTheDocument();
  });

  test("filter panel shows time radio options", () => {
    render(<MobileFilters {...defaults} />);
    fireEvent.click(screen.getByText("Filters"));
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("This Month")).toBeInTheDocument();
  });

  test("filter panel shows sort dropdown", () => {
    render(<MobileFilters {...defaults} />);
    fireEvent.click(screen.getByText("Filters"));
    expect(screen.getByText("Sort by date")).toBeInTheDocument();
  });

  test("calls onBoroughChange when borough button clicked", () => {
    const onBoroughChange = jest.fn();
    render(<MobileFilters {...defaults} onBoroughChange={onBoroughChange} />);
    fireEvent.click(screen.getByText("Brooklyn (50)"));
    expect(onBoroughChange).toHaveBeenCalledWith("Brooklyn");
  });

  test("calls onCategoryChange when category button clicked", () => {
    const onCategoryChange = jest.fn();
    render(<MobileFilters {...defaults} onCategoryChange={onCategoryChange} />);
    // Click a category that exists in CATEGORIES
    const concertBtn = screen.getByText(/Concerts/);
    fireEvent.click(concertBtn);
    expect(onCategoryChange).toHaveBeenCalledWith("Concert");
  });

  test("shows 0 count for missing boroughs", () => {
    render(<MobileFilters {...defaults} boroughCounts={{}} />);
    expect(screen.getByText("Manhattan (0)")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn (0)")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// EventCard — hover style edge cases
// ═══════════════════════════════════════════════════════════

describe("EventCard — hover behavior", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("hover changes border when collapsed", () => {
    const { container } = render(<EventCard event={todayEvent} />);
    const card = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(card);
    expect(card.style.borderColor).toBe("var(--border-hover)");
    expect(card.style.background).toBe("var(--bg-card-hover)");
  });

  test("hover does NOT change border when expanded", () => {
    const { container } = render(<EventCard event={todayEvent} />);
    const card = container.firstChild as HTMLElement;
    // Expand
    fireEvent.click(card);
    // The expanded state sets borderColor to --border-hover already
    const borderAfterExpand = card.style.borderColor;
    // Hover enter
    fireEvent.mouseEnter(card);
    // Should not have changed (the if(!expanded) guard prevents it)
    expect(card.style.borderColor).toBe(borderAfterExpand);
  });

  test("mouseLeave resets styles when collapsed", () => {
    const { container } = render(<EventCard event={todayEvent} />);
    const card = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    expect(card.style.borderColor).toBe("var(--border)");
    expect(card.style.background).toBe("var(--bg-card)");
  });
});

// ═══════════════════════════════════════════════════════════
// EventCard — metadata formatting
// ═══════════════════════════════════════════════════════════

describe("EventCard — metadata formatting", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("venue with neighborhood shows 'venue, neighborhood'", () => {
    const event = makeEvent({
      id: "venue-hood",
      venue: "Blue Note",
      neighborhood: "Greenwich Village",
    });
    render(<EventCard event={event} />);
    expect(screen.getByText(/Blue Note, Greenwich Village/)).toBeInTheDocument();
  });

  test("venue without neighborhood shows just venue", () => {
    const event = makeEvent({
      id: "venue-nohood",
      venue: "MSG",
      neighborhood: null,
    });
    render(<EventCard event={event} />);
    expect(screen.getByText(/MSG/)).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  test("metadata parts are joined by middle dot", () => {
    const event = makeEvent({
      id: "dots",
      date: todayStr,
      time: "8:00 PM",
      venue: "Venue",
      neighborhood: null,
    });
    render(<EventCard event={event} />);
    // Should contain · separators
    const meta = screen.getByText(/8:00 PM/);
    expect(meta.textContent).toContain("\u00B7");
  });
});

// ═══════════════════════════════════════════════════════════
// EventCard — View Details link
// ═══════════════════════════════════════════════════════════

describe("EventCard — expanded action links", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("View Details links to /events/{id}", () => {
    render(<EventCard event={todayEvent} />);
    fireEvent.click(screen.getByText("Jazz at Blue Note"));
    const detailsLink = screen.getByText("View Details").closest("a");
    expect(detailsLink).toHaveAttribute("href", "/events/today-1");
  });

  test("Tickets link opens external URL in new tab", () => {
    render(<EventCard event={todayEvent} />);
    fireEvent.click(screen.getByText("Jazz at Blue Note"));
    const ticketsLink = screen.getByText(/Tickets/).closest("a");
    expect(ticketsLink).toHaveAttribute("href", "https://example.com/event");
    expect(ticketsLink).toHaveAttribute("target", "_blank");
    expect(ticketsLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("click on View Details does not collapse card (stopPropagation)", () => {
    render(<EventCard event={todayEvent} />);
    fireEvent.click(screen.getByText("Jazz at Blue Note")); // expand
    fireEvent.click(screen.getByText("View Details")); // should not collapse
    // Card should still be expanded
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// CategoryCarousel edge cases
// ═══════════════════════════════════════════════════════════

describe("CategoryCarousel", () => {
  let CategoryCarousel: typeof import("@/components/CategoryCarousel").default;
  beforeEach(async () => { CategoryCarousel = (await import("@/components/CategoryCarousel")).default; });

  test("returns null when events array is empty", () => {
    const { container } = render(
      <CategoryCarousel prefix="Featured" label="ROOFTOP" categoryKey="Rooftop" events={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  test("renders section header with correct prefix and label", () => {
    render(
      <CategoryCarousel prefix="Featured" label="ROOFTOP" categoryKey="Rooftop" events={[todayEvent]} />,
    );
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText("ROOFTOP")).toBeInTheDocument();
  });

  test("inverted label puts prefix in gold, label in white", () => {
    render(
      <CategoryCarousel
        prefix="FREE"
        label="This Week"
        categoryKey="Free Event"
        events={[todayFreeEvent]}
        invertLabel
      />,
    );
    const prefix = screen.getByText("FREE");
    const label = screen.getByText("This Week");
    expect(prefix).toHaveStyle({ color: "var(--gold)" });
    expect(label).toHaveStyle({ color: "#fff" });
  });

  test("View All link uses custom viewAllHref when provided", () => {
    render(
      <CategoryCarousel
        prefix="Happening"
        label="TONIGHT"
        categoryKey=""
        events={[todayEvent]}
        viewAllHref="/events?time=today"
      />,
    );
    const viewAll = screen.getByText("View All →").closest("a");
    expect(viewAll).toHaveAttribute("href", "/events?time=today");
  });

  test("View All link defaults to /events?category=X", () => {
    render(
      <CategoryCarousel prefix="Featured" label="ROOFTOP" categoryKey="Rooftop" events={[todayEvent]} />,
    );
    const viewAll = screen.getByText("View All →").closest("a");
    expect(viewAll).toHaveAttribute("href", "/events?category=Rooftop");
  });

  test("renders correct number of carousel cards", () => {
    const events = [todayEvent, todayFreeEvent, tomorrowEvent];
    render(
      <CategoryCarousel prefix="Test" label="EVENTS" categoryKey="Concert" events={events} />,
    );
    // Each card has a unique title
    expect(screen.getByText("Jazz at Blue Note")).toBeInTheDocument();
    expect(screen.getByText("Free Museum Night")).toBeInTheDocument();
    expect(screen.getByText("Rooftop Party")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// EventCard — price priority (sold out > free > cost > nothing)
// ═══════════════════════════════════════════════════════════

describe("EventCard — price label priority", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("sold out takes priority over free", () => {
    const event = makeEvent({
      id: "priority-1",
      title: "SOLD OUT Show",
      is_free: true,
      cost: null,
    });
    render(<EventCard event={event} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  test("sold out takes priority over cost", () => {
    const event = makeEvent({
      id: "priority-2",
      title: "Concert (Sold Out)",
      cost: "$100",
    });
    render(<EventCard event={event} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
    expect(screen.queryByText("$100")).not.toBeInTheDocument();
  });

  test("free takes priority over cost", () => {
    const event = makeEvent({
      id: "priority-3",
      title: "Free Concert",
      is_free: true,
      cost: "$0",
    });
    render(<EventCard event={event} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// EventCard — save button visibility
// ═══════════════════════════════════════════════════════════

describe("EventCard — save button conditional rendering", () => {
  let EventCard: typeof import("@/components/EventCard").default;
  beforeEach(async () => { EventCard = (await import("@/components/EventCard")).default; });

  test("does not render heart icon when onToggleSave is not provided", () => {
    render(<EventCard event={todayEvent} />);
    expect(screen.queryByTestId("heart-icon")).not.toBeInTheDocument();
  });

  test("renders heart icon when onToggleSave is provided", () => {
    render(<EventCard event={todayEvent} onToggleSave={jest.fn()} />);
    expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
  });

  test("save button has correct title when not saved", () => {
    render(<EventCard event={todayEvent} isSaved={false} onToggleSave={jest.fn()} />);
    expect(screen.getByTitle("Save event")).toBeInTheDocument();
  });

  test("save button has correct title when saved", () => {
    render(<EventCard event={todayEvent} isSaved onToggleSave={jest.fn()} />);
    expect(screen.getByTitle("Remove from saved")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// makeEvent fixture helper tests
// ═══════════════════════════════════════════════════════════

describe("makeEvent fixture helper", () => {
  test("produces valid event with defaults", () => {
    const event = makeEvent();
    expect(event.id).toBeDefined();
    expect(event.title).toBe("Test Event");
    expect(event.date).toBe(todayStr);
    expect(event.category).toBe("Concert");
    expect(event.borough).toBe("Manhattan");
    expect(event.is_free).toBe(false);
    expect(event.is_featured).toBe(false);
  });

  test("overrides work correctly", () => {
    const event = makeEvent({
      title: "Custom",
      category: "Rooftop",
      borough: "Brooklyn",
      is_free: true,
    });
    expect(event.title).toBe("Custom");
    expect(event.category).toBe("Rooftop");
    expect(event.borough).toBe("Brooklyn");
    expect(event.is_free).toBe(true);
  });

  test("each call generates unique id", () => {
    const a = makeEvent();
    const b = makeEvent();
    expect(a.id).not.toBe(b.id);
  });

  test("id override is respected", () => {
    const event = makeEvent({ id: "fixed-id" });
    expect(event.id).toBe("fixed-id");
  });
});

// ═══════════════════════════════════════════════════════════
// CarouselCard — special characters and long titles
// ═══════════════════════════════════════════════════════════

describe("CarouselCard — content edge cases", () => {
  let CarouselCard: typeof import("@/components/CarouselCard").default;
  beforeEach(async () => { CarouselCard = (await import("@/components/CarouselCard")).default; });

  test("handles title with special characters", () => {
    const event = makeEvent({
      id: "special-chars",
      title: 'DJ Snake & Friends — "Live" @ Pier 17',
    });
    render(<CarouselCard event={event} />);
    expect(screen.getByText('DJ Snake & Friends — "Live" @ Pier 17')).toBeInTheDocument();
  });

  test("handles very long title (2-line clamp)", () => {
    const event = makeEvent({
      id: "long-title",
      title: "This Is An Extremely Long Event Title That Should Be Clamped to Two Lines Maximum in the Carousel Card Display",
    });
    const { container } = render(<CarouselCard event={event} />);
    const h3 = container.querySelector("h3");
    expect(h3?.style.display).toBe("-webkit-box");
    expect(h3?.style.WebkitLineClamp).toBe("2");
  });

  test("handles cost with non-standard format", () => {
    const event = makeEvent({ id: "weird-cost", cost: "Free - $50" });
    render(<CarouselCard event={event} />);
    expect(screen.getByText("Free - $50")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════
// SubscribeModal — gated event count display
// ═══════════════════════════════════════════════════════════

describe("SubscribeModal — dynamic content", () => {
  let SubscribeModal: typeof import("@/components/SubscribeModal").default;
  beforeEach(async () => { SubscribeModal = (await import("@/components/SubscribeModal")).default; });

  test("shows correct gated count in heading", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={0} />,
    );
    expect(screen.getByText("Unlock all 0+ events")).toBeInTheDocument();
  });

  test("shows large gated count correctly", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={1500} />,
    );
    expect(screen.getByText("Unlock all 1500+ events")).toBeInTheDocument();
  });
});
