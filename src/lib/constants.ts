export const SITE_NAME = "NYC INSIDER LIST";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nycinsiderlist.com";
export const PRICE_MONTHLY = "$2.99";

export const CATEGORIES = [
  { key: "Rooftop", label: "Rooftop", color: "#3b82f6" },
  { key: "Broadway", label: "Broadway", color: "#8b5cf6" },
  { key: "Concert", label: "Concerts", color: "#d97706" },
  { key: "Museum", label: "Museums", color: "#059669" },
  { key: "Festival", label: "Festivals", color: "#dc2626" },
  { key: "Free Event", label: "Free", color: "#10b981" },
  { key: "Sports", label: "Sports", color: "#ea580c" },
  { key: "Film", label: "Film", color: "#6366f1" },
  { key: "Other", label: "Other", color: "#52525b" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}
