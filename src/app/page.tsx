import { createServiceClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import Navbar from "@/components/Navbar";
import FeaturedEvents from "@/components/FeaturedEvents";
import EventExplorer from "@/components/EventExplorer";
import SubscribeCTA from "@/components/SubscribeCTA";

export const revalidate = 3600; // Re-fetch events every hour

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
    // Fallback: return empty array if Supabase isn't configured yet
    return [];
  }
}

export default async function HomePage() {
  const events = await getEvents();
  const featured = events.filter((e) => e.is_featured);

  return (
    <>
      <Navbar eventCount={events.length} />
      <main className="flex-1">
        <FeaturedEvents events={featured} />
        <EventExplorer events={events} />
        <SubscribeCTA />
      </main>
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-white/20">
        <p>&copy; {new Date().getFullYear()} NYC Insider List. All rights reserved.</p>
      </footer>
    </>
  );
}
