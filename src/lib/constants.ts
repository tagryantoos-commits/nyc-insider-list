export const SITE_NAME = "NYC INSIDER LIST";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nycinsiderlist.com";
export const PRICE_MONTHLY = "$2.99";

export const CATEGORIES = [
  { key: "Rooftop", label: "Rooftop", color: "#3b82f6" },
  { key: "Broadway", label: "Broadway", color: "#a855f7" },
  { key: "Concert", label: "Concerts", color: "#eab308" },
  { key: "Museum", label: "Museums", color: "#22c55e" },
  { key: "Festival", label: "Festivals", color: "#ef4444" },
  { key: "Free Event", label: "Free", color: "#10b981" },
  { key: "Sports", label: "Sports", color: "#f97316" },
  { key: "Film", label: "Film", color: "#818cf8" },
  { key: "Other", label: "Other", color: "#52525b" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}
