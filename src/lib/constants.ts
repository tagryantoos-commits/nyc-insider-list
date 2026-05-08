export const SITE_NAME = "NYC INSIDER LIST";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nycinsiderlist.com";
export const PRICE_MONTHLY = "$2.99";

export const CATEGORIES = [
  { key: "Rooftop", label: "Rooftop", color: "#4d9fff" },
  { key: "Broadway", label: "Broadway", color: "#c084fc" },
  { key: "Concert", label: "Concerts", color: "#f0c840" },
  { key: "Museum", label: "Museums", color: "#34d399" },
  { key: "Festival", label: "Festivals", color: "#f87171" },
  { key: "Free Event", label: "Free", color: "#22c55e" },
  { key: "Kid-Friendly", label: "Kid-Friendly", color: "#06b6d4" },
  { key: "Comedy", label: "Comedy", color: "#f59e0b" },
  { key: "Sports", label: "Sports", color: "#fb923c" },
  { key: "Film", label: "Film", color: "#818cf8" },
  { key: "Other", label: "Other", color: "#5a5a64" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

// Homepage carousel section definitions
export interface HomepageSection {
  category: string;
  prefix: string;
  label: string;
  numbered?: boolean;
  invertLabel?: boolean;
}

export const HOMEPAGE_SECTIONS: HomepageSection[] = [
  { category: "Rooftop", prefix: "Featured", label: "ROOFTOP" },
  { category: "Broadway", prefix: "This Week's", label: "BROADWAY", numbered: true },
  { category: "Concert", prefix: "Featured", label: "CONCERTS" },
  { category: "Sports", prefix: "This Week's", label: "SPORTS" },
  { category: "Festival", prefix: "Featured", label: "FESTIVALS" },
  { category: "Free Event", prefix: "FREE", label: "This Week", invertLabel: true },
  { category: "Kid-Friendly", prefix: "Family-Friendly", label: "THIS WEEK", invertLabel: true },
  { category: "Comedy", prefix: "Tonight's", label: "COMEDY" },
  { category: "Museum", prefix: "Coming Soon", label: "MUSEUMS" },
];
