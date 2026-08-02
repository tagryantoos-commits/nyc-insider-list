import { render, screen, fireEvent } from "@testing-library/react";
import { makeEvent, todayFreeEvent, featuredEvent, gatedEvent } from "./fixtures";

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock("lucide-react", () => ({
  Heart: (props: Record<string, unknown>) => <svg data-testid="heart-icon" {...props} />,
  Lock: (props: Record<string, unknown>) => <svg data-testid="lock-icon" {...props} />,
}));

describe("EventListRow", () => {
  let EventListRow: typeof import("@/components/EventListRow").default;
  beforeEach(async () => { EventListRow = (await import("@/components/EventListRow")).default; });

  test("links to the event detail page", () => {
    const event = makeEvent({ id: "abc", title: "Rooftop Party" });
    render(<EventListRow event={event} />);
    expect(screen.getByText("Rooftop Party").closest("a")).toHaveAttribute("href", "/events/abc");
  });

  test("shows a FREE badge for free events", () => {
    render(<EventListRow event={todayFreeEvent} />);
    expect(screen.getByText("FREE")).toBeInTheDocument();
  });

  test("shows a PICK badge for featured events", () => {
    render(<EventListRow event={featuredEvent} />);
    expect(screen.getByText("PICK")).toBeInTheDocument();
  });

  test("gated rows render a lock and call onGatedClick instead of linking", () => {
    const onGatedClick = jest.fn();
    render(<EventListRow event={gatedEvent} isGated onGatedClick={onGatedClick} />);
    expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
    // No detail link when gated
    expect(screen.getByText(gatedEvent.title).closest("a")).toBeNull();
    fireEvent.click(screen.getByText(gatedEvent.title).closest("button")!);
    expect(onGatedClick).toHaveBeenCalled();
  });

  test("save toggle fires without navigating", () => {
    const onToggleSave = jest.fn();
    const event = makeEvent({ id: "save-me" });
    render(<EventListRow event={event} onToggleSave={onToggleSave} isSaved={false} />);
    fireEvent.click(screen.getByTestId("heart-icon").closest("button")!);
    expect(onToggleSave).toHaveBeenCalledWith("save-me");
  });

  test("shows a date when showDate is set", () => {
    const event = makeEvent({ id: "d1", date: "2026-08-15", time: null, venue: null, neighborhood: null });
    render(<EventListRow event={event} showDate />);
    expect(screen.getByText(/8\/15/)).toBeInTheDocument();
  });
});
