import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/events",
    "/happy-hours",
    "/plan-my-day",
    "/spontaneous",
    "/subscribe",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/events" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  // Individual future-event pages — the shareable, indexable long tail
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("events")
      .select("id, updated_at")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(5000);

    const eventRoutes: MetadataRoute.Sitemap = (data ?? []).map((e) => ({
      url: `${SITE_URL}/events/${e.id}`,
      lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
