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

export type ViewMode = "cards" | "list";

export type TimeFilter = "all" | "upcoming" | "week" | "month";
