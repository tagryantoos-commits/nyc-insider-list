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

export default async function HomePage() {
  const events = await getEvents();
  const featured = events.filter((e) => e.is_featured);

  return <EventExplorer events={events} featured={featured} />;
}
