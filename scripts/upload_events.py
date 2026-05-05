"""Upload events from events_raw.json to Supabase.

Usage:
    python scripts/upload_events.py /path/to/events_raw.json

Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import json
import os
import sys
from datetime import datetime

from supabase import create_client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Events that should be marked as featured
FEATURED_KEYWORDS = [
    "gov ball", "governors ball", "pride", "ariana grande", "beyonce",
    "taylor swift", "summerstage", "tribeca festival", "met gala",
    "fleet week", "macy's", "central park", "jimmy eat world",
    "young the giant", "tash sultana", "lupe fiasco", "belle & sebastian",
]


def load_events(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def classify_borough(venue, neighborhood):
    text = f"{venue or ''} {neighborhood or ''}".lower()
    if "brooklyn" in text:
        return "Brooklyn"
    if "queens" in text:
        return "Queens"
    if "bronx" in text or "yankee stadium" in text:
        return "Bronx"
    if "staten island" in text:
        return "Staten Island"
    brooklyn_kw = ["williamsburg", "bushwick", "greenpoint", "dumbo", "park slope",
                   "cobble hill", "fort greene", "prospect", "barclays", "brooklyn steel",
                   "brooklyn bowl", "brooklyn mirage", "brooklyn museum", "coney island"]
    if any(n in text for n in brooklyn_kw):
        return "Brooklyn"
    queens_kw = ["astoria", "long island city", "flushing", "citi field", "usta", "rockaway"]
    if any(n in text for n in queens_kw):
        return "Queens"
    return "Manhattan"


def parse_time(date_start: str) -> tuple[str | None, str | None]:
    """Extract time portion from ISO datetime string."""
    if not date_start or len(date_start) <= 10:
        return None, None
    try:
        dt = datetime.fromisoformat(date_start.replace("Z", "+00:00"))
        return dt.strftime("%I:%M %p").lstrip("0"), None
    except (ValueError, TypeError):
        return None, None


def is_featured(event: dict) -> bool:
    title = (event.get("title") or "").lower()
    desc = (event.get("description") or "").lower()
    text = title + " " + desc
    return any(kw in text for kw in FEATURED_KEYWORDS)


def transform_event(raw: dict) -> dict:
    """Map scraper event to Supabase schema."""
    date_start = raw.get("date_start", "")
    date = date_start[:10] if date_start else None
    if not date:
        return {}

    time_str, end_time = parse_time(date_start)
    if raw.get("date_end") and raw["date_end"] != date_start:
        _, end_time_parsed = parse_time(raw["date_end"])
        if end_time_parsed:
            end_time = end_time_parsed

    venue = (raw.get("location") or "")[:200] or None
    neighborhood = raw.get("neighborhood") or None

    return {
        "title": (raw.get("title") or "").strip()[:500],
        "date": date,
        "time": time_str,
        "end_time": end_time,
        "venue": venue,
        "address": (raw.get("address") or "")[:300] or None,
        "neighborhood": neighborhood,
        "borough": classify_borough(venue, neighborhood),
        "category": raw.get("category", "Other"),
        "cost": None,
        "is_free": raw.get("is_free", False),
        "url": (raw.get("url") or "")[:500] or None,
        "description": (raw.get("description") or "")[:1000] or None,
        "source": raw.get("source", ""),
        "is_featured": is_featured(raw),
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/upload_events.py /path/to/events_raw.json")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars")
        sys.exit(1)

    print(f"Loading events from {path}...")
    raw_events = load_events(path)
    print(f"Loaded {len(raw_events)} raw events")

    # Transform
    events = []
    skipped = 0
    for raw in raw_events:
        transformed = transform_event(raw)
        if transformed and transformed.get("title") and transformed.get("date"):
            events.append(transformed)
        else:
            skipped += 1

    print(f"Transformed {len(events)} events ({skipped} skipped, no date or title)")

    # Upload to Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    batch_size = 100
    upserted = 0
    errors = 0

    for i in range(0, len(events), batch_size):
        batch = events[i : i + batch_size]
        try:
            result = supabase.table("events").upsert(
                batch, on_conflict="title,date,venue"
            ).execute()
            upserted += len(batch)
        except Exception as e:
            print(f"  Error on batch {i // batch_size + 1}: {e}")
            # Try individual inserts for this batch
            for event in batch:
                try:
                    supabase.table("events").upsert(
                        event, on_conflict="title,date,venue"
                    ).execute()
                    upserted += 1
                except Exception:
                    errors += 1

    # Count featured
    featured = sum(1 for e in events if e.get("is_featured"))

    print(f"\nResults:")
    print(f"  Upserted: {upserted}")
    print(f"  Errors:   {errors}")
    print(f"  Featured: {featured}")
    print(f"  Total in batch: {len(events)}")


if __name__ == "__main__":
    main()
