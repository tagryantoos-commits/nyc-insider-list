import { createServiceClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import EventExplorer from "@/components/EventExplorer";

export const revalidate = 3600;

async function getEvents(): Promise<Event[]> {
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("date", today)
      .order("date", { ascending: true });
    if (error) throw error;
    return (data as Event[]) ?? [];
  } catch {
    return [];
  }
}

async function getSubscriberCount(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; borough?: string }>;
}) {
  const [events, subscriberCount, params] = await Promise.all([
    getEvents(),
    getSubscriberCount(),
    searchParams,
  ]);

  return (
    <EventExplorer
      events={events}
      initialCategory={params.category ?? null}
      initialSearch={params.q ?? ""}
      subscriberCount={subscriberCount}
    />
  );
}
