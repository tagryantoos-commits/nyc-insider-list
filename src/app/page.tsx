import { createServiceClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import MagazineHome from "@/components/MagazineHome";

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

export default async function HomePage() {
  const events = await getEvents();
  return <MagazineHome events={events} />;
}
