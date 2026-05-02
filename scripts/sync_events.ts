/**
 * Sync events from events_raw.json to Supabase.
 *
 * Usage:
 *   npx tsx scripts/sync_events.ts /path/to/events_raw.json
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FEATURED_KEYWORDS = [
  "gov ball", "governors ball", "pride", "ariana grande", "beyonce",
  "taylor swift", "summerstage", "tribeca festival", "met gala",
  "fleet week", "macy's", "central park", "jimmy eat world",
  "young the giant", "tash sultana", "lupe fiasco", "belle & sebastian",
];

interface RawEvent {
  title?: string;
  date_start?: string;
  date_end?: string;
  location?: string;
  address?: string;
  category?: string;
  is_free?: boolean;
  url?: string;
  description?: string;
  source?: string;
}

function parseTime(dateStr: string): string | null {
  if (!dateStr || dateStr.length <= 10) return null;
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

function isFeatured(raw: RawEvent): boolean {
  const text = `${raw.title ?? ""} ${raw.description ?? ""}`.toLowerCase();
  return FEATURED_KEYWORDS.some((kw) => text.includes(kw));
}

function transform(raw: RawEvent) {
  const dateStart = raw.date_start ?? "";
  const date = dateStart.slice(0, 10);
  if (!date || !raw.title?.trim()) return null;

  return {
    title: raw.title.trim().slice(0, 500),
    date,
    time: parseTime(dateStart),
    end_time: raw.date_end ? parseTime(raw.date_end) : null,
    venue: raw.location?.slice(0, 200) || null,
    address: raw.address?.slice(0, 300) || null,
    neighborhood: null,
    category: raw.category ?? "Other",
    cost: null,
    is_free: raw.is_free ?? false,
    url: raw.url?.slice(0, 500) || null,
    description: raw.description?.slice(0, 1000) || null,
    source: raw.source ?? "",
    is_featured: isFeatured(raw),
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/sync_events.ts /path/to/events_raw.json");
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log(`Loading events from ${filePath}...`);
  const raw: RawEvent[] = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log(`Loaded ${raw.length} raw events`);

  const events = raw.map(transform).filter(Boolean);
  console.log(`Transformed ${events.length} events`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Upsert in batches
  const batchSize = 100;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const { error } = await supabase
      .from("events")
      .upsert(batch as Record<string, unknown>[], { onConflict: "title,date,venue" });

    if (error) {
      console.error(`  Batch ${Math.floor(i / batchSize) + 1} error: ${error.message}`);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  // Remove old events (> 30 days past)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .lt("date", cutoffStr);

  console.log(`\nResults:`);
  console.log(`  Upserted: ${upserted}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Old events removed: ${count ?? 0}`);
  console.log(`  Featured: ${events.filter((e) => e?.is_featured).length}`);
}

main().catch(console.error);
