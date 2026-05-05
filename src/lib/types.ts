export interface Event {
  id: string;
  title: string;
  date: string;
  time: string | null;
  end_time: string | null;
  venue: string | null;
  address: string | null;
  neighborhood: string | null;
  category: string;
  cost: string | null;
  is_free: boolean;
  url: string | null;
  description: string | null;
  source: string | null;
  borough: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: "active" | "inactive" | "canceled" | "past_due";
  google_calendar_granted: boolean;
  created_at: string;
  updated_at: string;
}

export type TimeFilter = "all" | "today" | "week" | "month";

export type SortMode = "date" | "price-low" | "price-high";

export interface HappyHour {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  borough: string;
  latitude: number | null;
  longitude: number | null;
  cuisine_type: string | null;
  vibe: string | null;
  days: string[];
  start_time: string | null;
  end_time: string | null;
  has_late_night_happy_hour: boolean;
  late_night_start: string | null;
  late_night_end: string | null;
  drink_specials: string | null;
  food_specials: string | null;
  has_food_specials: boolean;
  price_tier: string | null;
  has_live_music: boolean;
  music_details: string | null;
  has_entertainment: boolean;
  entertainment_details: string | null;
  has_outdoor_seating: boolean;
  outdoor_type: string | null;
  seating_type: string | null;
  reservations: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  google_maps_url: string | null;
  is_hotel_bar: boolean;
  source: string | null;
  quality_score: number;
  is_active: boolean;
}

export type HHSortMode = "quality" | "name" | "neighborhood" | "price-low" | "price-high";

export const VIBES = [
  { key: "pub", label: "Pub", color: "#fb923c" },
  { key: "restaurant_bar", label: "Restaurant Bar", color: "#f87171" },
  { key: "cocktail_lounge", label: "Cocktail Lounge", color: "#c084fc" },
  { key: "wine_bar", label: "Wine Bar", color: "#f472b6" },
  { key: "rooftop", label: "Rooftop", color: "#4d9fff" },
  { key: "speakeasy", label: "Speakeasy", color: "#a78bfa" },
  { key: "sports_bar", label: "Sports Bar", color: "#34d399" },
  { key: "hotel_bar", label: "Hotel Bar", color: "#f0c840" },
  { key: "dive_bar", label: "Dive Bar", color: "#6b7280" },
  { key: "beer_garden", label: "Beer Garden", color: "#22c55e" },
  { key: "lounge", label: "Lounge", color: "#818cf8" },
  { key: "tiki_bar", label: "Tiki Bar", color: "#fb923c" },
] as const;

export function getVibeMeta(key: string) {
  return VIBES.find((v) => v.key === key) ?? { key, label: key, color: "#6b7280" };
}
