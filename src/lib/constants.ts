export const SITE_NAME = "NYC Insider List";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nycinsiderlist.com";
export const PRICE_MONTHLY = "$2.99";

export const CATEGORIES = [
  { key: "Rooftop", label: "Rooftop", emoji: "⬆", color: "#3b82f6" },
  { key: "Broadway", label: "Broadway", emoji: "🎭", color: "#a855f7" },
  { key: "Concert", label: "Concerts", emoji: "🎵", color: "#eab308" },
  { key: "Museum", label: "Museums", emoji: "🖼", color: "#22c55e" },
  { key: "Festival", label: "Festivals", emoji: "🎪", color: "#ef4444" },
  { key: "Free Event", label: "Free Events", emoji: "🎟", color: "#10b981" },
  { key: "Sports", label: "Sports", emoji: "⚾", color: "#f97316" },
  { key: "Film", label: "Film", emoji: "🎬", color: "#818cf8" },
  { key: "Other", label: "Other", emoji: "📌", color: "#64748b" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}
