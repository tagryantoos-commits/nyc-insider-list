import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  allTestEvents,
  todayEvent,
  todayFreeEvent,
  todaySoldOutEvent,
  tomorrowEvent,
  featuredEvent,
  gatedEvent,
  gatedFreeEvent,
  brooklynEvent,
} from "./fixtures";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/events",
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock lucide-react icons
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

// ─── EventCard Tests ──────────────────────────────────────

describe("EventCard", () => {
  let EventCard: typeof import("@/components/EventCard").default;

  beforeEach(async () => {
    const mod = await import("@/components/EventCard");
    EventCard = mod.default;
  });

  test("renders event title, category, and metadata", () => {
    render(<EventCard event={todayEvent} />);
    expect(screen.getByText("Jazz at Blue Note")).toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
    expect(screen.getByText("$35")).toBeInTheDocument();
  });

  test("shows Free label for free events", () => {
    render(<EventCard event={todayFreeEvent} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  test("shows Sold Out label and reduced opacity", () => {
    const { container } = render(<EventCard event={todaySoldOutEvent} />);
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
    const card = container.firstChild as HTMLElement;
    expect(card.style.opacity).toBe("0.5");
  });

  test("shows Insider Pick badge when isInsiderPick is true", () => {
    render(<EventCard event={todayEvent} isInsiderPick />);
    expect(screen.getByText("PICK")).toBeInTheDocument();
  });

  test("does not show Insider Pick badge by default", () => {
    render(<EventCard event={todayEvent} />);
    expect(screen.queryByText("PICK")).not.toBeInTheDocument();
  });

  test("shows lock icon and blurred metadata when gated", () => {
    render(<EventCard event={gatedEvent} isGated />);
    expect(screen.getByText("Subscribe to unlock details")).toBeInTheDocument();
    expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
  });

  test("calls onGatedClick when gated card is clicked", () => {
    const onGatedClick = jest.fn();
    render(<EventCard event={gatedEvent} isGated onGatedClick={onGatedClick} />);
    fireEvent.click(screen.getByText("Future Concert at MSG"));
    expect(onGatedClick).toHaveBeenCalledTimes(1);
  });

  test("does not expand when gated card is clicked", () => {
    const onGatedClick = jest.fn();
    render(<EventCard event={gatedEvent} isGated onGatedClick={onGatedClick} />);
    fireEvent.click(screen.getByText("Future Concert at MSG"));
    // Description should not appear
    expect(screen.queryByText(/great event/i)).not.toBeInTheDocument();
  });

  test("expands to show description when non-gated card is clicked", () => {
    render(<EventCard event={todayEvent} />);
    fireEvent.click(screen.getByText("Jazz at Blue Note"));
    expect(screen.getByText(/great event description/i)).toBeInTheDocument();
  });

  test("shows View Details and Tickets buttons when expanded", () => {
    render(<EventCard event={todayEvent} />);
    fireEvent.click(screen.getByText("Jazz at Blue Note"));
    expect(screen.getByText("View Details")).toBeInTheDocument();
    expect(screen.getByText(/Tickets/)).toBeInTheDocument();
  });

  test("shows heart icon with save functionality", () => {
    const onToggleSave = jest.fn();
    render(<EventCard event={todayEvent} isSaved={false} onToggleSave={onToggleSave} />);
    const heartIcon = screen.getByTestId("heart-icon");
    fireEvent.click(heartIcon.closest("button")!);
    expect(onToggleSave).toHaveBeenCalledWith("today-1");
  });

  test("shows filled heart when saved", () => {
    render(<EventCard event={todayEvent} isSaved onToggleSave={jest.fn()} />);
    const heartIcon = screen.getByTestId("heart-icon");
    expect(heartIcon).toHaveStyle({ fill: "#ef4444" });
  });

  test("blurs metadata line when gated", () => {
    render(<EventCard event={gatedEvent} isGated />);
    // Find the metadata paragraph (contains the date/venue info)
    const metaElements = screen.getAllByText(/May/);
    const blurredMeta = metaElements.find(
      (el) => el.style.filter === "blur(4px)",
    );
    expect(blurredMeta).toBeTruthy();
  });
});

// ─── CarouselCard Tests ───────────────────────────────────

describe("CarouselCard", () => {
  let CarouselCard: typeof import("@/components/CarouselCard").default;

  beforeEach(async () => {
    const mod = await import("@/components/CarouselCard");
    CarouselCard = mod.default;
  });

  test("renders event title and category", () => {
    render(<CarouselCard event={todayEvent} />);
    expect(screen.getByText("Jazz at Blue Note")).toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  test("renders rank badge when numbered", () => {
    render(<CarouselCard event={todayEvent} rank={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("does not render rank badge without rank prop", () => {
    render(<CarouselCard event={todayEvent} />);
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  test("shows Insider Pick badge", () => {
    render(<CarouselCard event={todayEvent} isInsiderPick />);
    expect(screen.getByText("PICK")).toBeInTheDocument();
  });

  test("shows lock message when gated", () => {
    render(<CarouselCard event={gatedEvent} isGated />);
    expect(screen.getByText("Subscribe for details")).toBeInTheDocument();
    expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
  });

  test("calls onGatedClick when gated card is clicked", () => {
    const onGatedClick = jest.fn();
    render(<CarouselCard event={gatedEvent} isGated onGatedClick={onGatedClick} />);
    fireEvent.click(screen.getByText("Future Concert at MSG"));
    expect(onGatedClick).toHaveBeenCalled();
  });

  test("has fixed dimensions", () => {
    const { container } = render(<CarouselCard event={todayEvent} />);
    const card = container.firstChild as HTMLElement;
    expect(card.style.width).toBe("240px");
    expect(card.style.height).toBe("140px");
  });

  test("masks price for gated events", () => {
    render(<CarouselCard event={gatedEvent} isGated />);
    expect(screen.getByText("$ ---")).toBeInTheDocument();
    expect(screen.queryByText("$89")).not.toBeInTheDocument();
  });
});

// ─── CalendarPreview Tests ────────────────────────────────

describe("CalendarPreview", () => {
  let CalendarPreview: typeof import("@/components/CalendarPreview").default;

  beforeEach(async () => {
    const mod = await import("@/components/CalendarPreview");
    CalendarPreview = mod.default;
  });

  test("renders the calendar header", () => {
    render(<CalendarPreview events={allTestEvents} />);
    expect(screen.getByText("NYC Insider List")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
  });

  test("renders Today label", () => {
    render(<CalendarPreview events={allTestEvents} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  test("shows category legend", () => {
    render(<CalendarPreview events={allTestEvents} />);
    expect(screen.getByText("Rooftop")).toBeInTheDocument();
  });

  test("shows sync caption", () => {
    render(<CalendarPreview events={allTestEvents} />);
    expect(screen.getByText("Events auto-sync to your Google Calendar by category")).toBeInTheDocument();
  });
});

// ─── SubscribeModal Tests ─────────────────────────────────

describe("SubscribeModal", () => {
  let SubscribeModal: typeof import("@/components/SubscribeModal").default;

  beforeEach(async () => {
    const mod = await import("@/components/SubscribeModal");
    SubscribeModal = mod.default;
  });

  test("does not render when isOpen is false", () => {
    render(
      <SubscribeModal isOpen={false} onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );
    expect(screen.queryByText(/Unlock all/)).not.toBeInTheDocument();
  });

  test("renders when isOpen is true", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );
    expect(screen.getByText("Unlock all 100+ events")).toBeInTheDocument();
  });

  test("shows value propositions", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );
    expect(screen.getByText("10 category calendars")).toBeInTheDocument();
    expect(screen.getByText("Auto-updated weekly")).toBeInTheDocument();
    expect(screen.getByText("Insider Picks included")).toBeInTheDocument();
  });

  test("shows subscriber count when provided", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} subscriberCount={47} />,
    );
    expect(screen.getByText("Join 47+ subscribers")).toBeInTheDocument();
  });

  test("does not show subscriber count when zero", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} subscriberCount={0} />,
    );
    expect(screen.queryByText(/subscribers/)).not.toBeInTheDocument();
  });

  test("shows email input and subscribe button", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );
    expect(screen.getByPlaceholderText("Your Google account email")).toBeInTheDocument();
    expect(screen.getByText(/Subscribe.*\$2\.99/)).toBeInTheDocument();
  });

  test("shows free trial messaging", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );
    expect(screen.getByText(/7-day free trial/)).toBeInTheDocument();
  });

  test("calls onClose when X button is clicked", () => {
    const onClose = jest.fn();
    render(
      <SubscribeModal isOpen onClose={onClose} events={allTestEvents} gatedEventCount={100} />,
    );
    const closeButton = screen.getByTestId("x-icon").closest("button")!;
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  test("calls onClose when backdrop is clicked", () => {
    const onClose = jest.fn();
    const { container } = render(
      <SubscribeModal isOpen onClose={onClose} events={allTestEvents} gatedEventCount={100} />,
    );
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  test("contains calendar preview", () => {
    render(
      <SubscribeModal isOpen onClose={jest.fn()} events={allTestEvents} gatedEventCount={100} />,
    );
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
  });
});

// ─── Hero Tests ───────────────────────────────────────────

describe("Hero", () => {
  let Hero: typeof import("@/components/Hero").default;

  beforeEach(async () => {
    const mod = await import("@/components/Hero");
    Hero = mod.default;
  });

  test("renders title", () => {
    render(<Hero eventCount={500} addedThisWeek={20} searchQuery="" onSearchChange={jest.fn()} />);
    expect(screen.getByText("New York's Insider Guide")).toBeInTheDocument();
  });

  test("shows event count with locale formatting", () => {
    render(<Hero eventCount={1234} addedThisWeek={20} searchQuery="" onSearchChange={jest.fn()} />);
    // 1,234 with locale formatting
    expect(screen.getByText(/1,234 events/)).toBeInTheDocument();
  });

  test("shows 'added this week' when count > 0", () => {
    render(<Hero eventCount={500} addedThisWeek={42} searchQuery="" onSearchChange={jest.fn()} />);
    expect(screen.getByText(/42 added this week/)).toBeInTheDocument();
  });

  test("shows 'Updated weekly' when addedThisWeek is 0", () => {
    render(<Hero eventCount={500} addedThisWeek={0} searchQuery="" onSearchChange={jest.fn()} />);
    expect(screen.getByText(/Updated weekly/)).toBeInTheDocument();
  });

  test("renders search input with value", () => {
    render(<Hero eventCount={500} addedThisWeek={20} searchQuery="jazz" onSearchChange={jest.fn()} />);
    const input = screen.getByPlaceholderText(/Search events/);
    expect(input).toHaveValue("jazz");
  });

  test("calls onSearchChange when typing", () => {
    const onSearchChange = jest.fn();
    render(<Hero eventCount={500} addedThisWeek={20} searchQuery="" onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText(/Search events/);
    fireEvent.change(input, { target: { value: "rooftop" } });
    expect(onSearchChange).toHaveBeenCalledWith("rooftop");
  });
});

// ─── SubscribeCTA Tests ───────────────────────────────────

describe("SubscribeCTA", () => {
  let SubscribeCTA: typeof import("@/components/SubscribeCTA").default;

  beforeEach(async () => {
    const mod = await import("@/components/SubscribeCTA");
    SubscribeCTA = mod.default;
  });

  test("renders CTA heading", () => {
    render(<SubscribeCTA />);
    expect(screen.getByText("Get every event in your calendar")).toBeInTheDocument();
  });

  test("shows subscribe button", () => {
    render(<SubscribeCTA />);
    expect(screen.getByText("Subscribe $2.99/mo")).toBeInTheDocument();
  });

  test("shows subscriber count when provided", () => {
    render(<SubscribeCTA subscriberCount={47} />);
    expect(screen.getByText("Join 47+ subscribers")).toBeInTheDocument();
  });

  test("hides subscriber count when zero", () => {
    render(<SubscribeCTA subscriberCount={0} />);
    expect(screen.queryByText(/subscribers/)).not.toBeInTheDocument();
  });

  test("shows free trial text", () => {
    render(<SubscribeCTA />);
    expect(screen.getByText(/7-day free trial/)).toBeInTheDocument();
  });

  test("calls onSubscribeClick when button is clicked", () => {
    const onClick = jest.fn();
    render(<SubscribeCTA onSubscribeClick={onClick} />);
    fireEvent.click(screen.getByText("Subscribe $2.99/mo"));
    expect(onClick).toHaveBeenCalled();
  });
});

// ─── Footer Tests ─────────────────────────────────────────

describe("Footer", () => {
  let Footer: typeof import("@/components/Footer").default;

  beforeEach(async () => {
    const mod = await import("@/components/Footer");
    Footer = mod.default;
  });

  test("renders category links", () => {
    render(<Footer />);
    expect(screen.getByText("Rooftop")).toBeInTheDocument();
    expect(screen.getByText("Broadway")).toBeInTheDocument();
    expect(screen.getByText("Concerts")).toBeInTheDocument();
  });

  test("renders borough links", () => {
    render(<Footer />);
    expect(screen.getByText("Manhattan")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn")).toBeInTheDocument();
    expect(screen.getByText("Queens")).toBeInTheDocument();
    expect(screen.getByText("Bronx")).toBeInTheDocument();
  });

  test("renders explore links", () => {
    render(<Footer />);
    expect(screen.getByText("All Events")).toBeInTheDocument();
    expect(screen.getByText("Happy Hours")).toBeInTheDocument();
    expect(screen.getByText("Subscribe")).toBeInTheDocument();
  });

  test("renders copyright", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument();
  });

  test("category links point to correct URLs", () => {
    render(<Footer />);
    const rooftopLink = screen.getByText("Rooftop").closest("a");
    expect(rooftopLink).toHaveAttribute("href", "/events?category=Rooftop");
  });

  test("borough links point to correct URLs", () => {
    render(<Footer />);
    const brooklynLink = screen.getByText("Brooklyn").closest("a");
    expect(brooklynLink).toHaveAttribute("href", "/events?borough=Brooklyn");
  });
});

// ─── Constants Tests ──────────────────────────────────────

describe("Constants", () => {
  test("getCategoryMeta returns correct color for known category", () => {
    const { getCategoryMeta } = require("@/lib/constants");
    const meta = getCategoryMeta("Rooftop");
    expect(meta.color).toBe("#4d9fff");
    expect(meta.label).toBe("Rooftop");
  });

  test("getCategoryMeta returns fallback for unknown category", () => {
    const { getCategoryMeta } = require("@/lib/constants");
    const meta = getCategoryMeta("Nonexistent");
    expect(meta.key).toBe("Other");
  });

  test("CATEGORIES includes all expected categories", () => {
    const { CATEGORIES } = require("@/lib/constants");
    const keys = CATEGORIES.map((c: { key: string }) => c.key);
    expect(keys).toContain("Rooftop");
    expect(keys).toContain("Broadway");
    expect(keys).toContain("Concert");
    expect(keys).toContain("Museum");
    expect(keys).toContain("Sports");
  });

  test("HOMEPAGE_SECTIONS has correct structure", () => {
    const { HOMEPAGE_SECTIONS } = require("@/lib/constants");
    expect(HOMEPAGE_SECTIONS.length).toBeGreaterThan(0);
    expect(HOMEPAGE_SECTIONS[0]).toHaveProperty("category");
    expect(HOMEPAGE_SECTIONS[0]).toHaveProperty("prefix");
    expect(HOMEPAGE_SECTIONS[0]).toHaveProperty("label");
  });
});
