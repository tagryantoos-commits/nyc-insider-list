import { createServiceClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import EventExplorer from "@/components/EventExplorer";

export const revalidate = 3600;

async function getEvents(): Promise<Event[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data as Event[]) ?? [];
  } catch {
    return [];
  }
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const events = await getEvents();
  const params = await searchParams;

  return (
    <EventExplorer
      events={events}
      initialCategory={params.category ?? null}
      initialSearch={params.q ?? ""}
    />
  );
}
