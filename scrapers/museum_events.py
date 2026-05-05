"""Scrape museum exhibitions, events, and recurring free nights across NYC.

Pushes to NYC - Museums Google Calendar + Supabase events table.
"""

import json
import logging
import os
import re
import sys
import time
from datetime import datetime, date, timedelta

import requests as http_requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser
from dateutil.rrule import rrule, WEEKLY, MONTHLY, FR, SA, TH
from thefuzz import fuzz

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

GCAL_TOKEN = os.path.join(os.path.dirname(__file__), "..", "..", "nyc-events-calendar", "token.json")
MUSEUM_CAL_ID = "c_6db4a35d2aa05597c46ca3fa71aa9ff13ec100cc9e8ab6b19690b487e730d3af@group.calendar.google.com"

TODAY = date.today()
MAX_DATE = TODAY + timedelta(days=90)


def fetch(url):
    try:
        resp = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
        if resp.status_code == 200:
            return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        logger.warning(f"Fetch failed: {url}: {e}")
    return None


def fetch_playwright(url, wait_selector="body", timeout_ms=20000):
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=USER_AGENT)
            page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            try:
                page.wait_for_selector(wait_selector, timeout=8000)
            except Exception:
                pass
            html = page.content()
            browser.close()
            return BeautifulSoup(html, "lxml")
    except Exception as e:
        logger.warning(f"Playwright failed: {url}: {e}")
    return None


def parse_date_safe(text):
    if not text:
        return None
    try:
        dt = dateparser.parse(text, fuzzy=True)
        if dt and TODAY <= dt.date() <= MAX_DATE:
            return dt
    except (ValueError, OverflowError):
        pass
    return None


def make_event(title, date_str, time_str=None, end_time=None, venue="",
               neighborhood="", borough="Manhattan", cost="", is_free=False,
               url="", description="", source="", event_type="event",
               is_featured=False):
    return {
        "title": title.strip(),
        "date": date_str,
        "time": time_str,
        "end_time": end_time,
        "venue": venue,
        "neighborhood": neighborhood,
        "borough": borough,
        "category": "Museum",
        "cost": cost,
        "is_free": is_free,
        "url": url,
        "description": description[:500] if description else "",
        "source": source,
        "event_type": event_type,
        "is_featured": is_featured,
    }


# ── Generic museum scraper ────────────────────────────────

def scrape_museum_site(name, urls, neighborhood, borough="Manhattan", slug=None):
    """Scrape a museum's exhibition/event pages for JSON-LD and HTML events."""
    slug = slug or name.lower().replace(" ", "_").replace("'", "")
    events = []

    for url in urls:
        soup = fetch(url)
        if not soup or len(soup.get_text()) < 500:
            soup = fetch_playwright(url, wait_selector="article, h2, h3, [class*='exhibition'], [class*='event']")
        if not soup:
            continue

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") in ("Event", "ExhibitionEvent", "VisualArtsEvent",
                                              "ScreeningEvent", "MusicEvent", "EducationEvent"):
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue

                        etype = "exhibition"
                        itype = item.get("@type", "").lower()
                        if "screening" in itype:
                            etype = "screening"
                        elif "music" in itype:
                            etype = "performance"
                        elif "education" in itype:
                            etype = "lecture"

                        events.append(make_event(
                            title=item.get("name", ""),
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=name,
                            neighborhood=neighborhood,
                            borough=borough,
                            url=item.get("url", url),
                            description=item.get("description", ""),
                            source=f"museum_scraper_{slug}",
                            event_type=etype,
                            is_featured="exhibition" in etype,
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        # HTML fallback: look for exhibition/event cards
        if not any(e["source"] == f"museum_scraper_{slug}" for e in events):
            selectors = "article, [class*='exhibition'], [class*='event'], .card, .listing, li.list-item"
            for card in soup.select(selectors):
                title_el = card.select_one("h2, h3, h4, [class*='title']")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                if not title or len(title) < 4 or len(title) > 150:
                    continue
                if title.lower() in ("exhibitions", "events", "calendar", "upcoming", "current"):
                    continue

                text = card.get_text(" ", strip=True)
                dt = parse_date_safe(text)

                # For exhibitions, look for date range text
                date_str = ""
                if dt:
                    date_str = dt.strftime("%Y-%m-%d")
                else:
                    # Try to find any date in the text
                    date_match = re.search(
                        r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s+\d{4})?)',
                        text,
                    )
                    if date_match:
                        dt = parse_date_safe(date_match.group(1))
                        if dt:
                            date_str = dt.strftime("%Y-%m-%d")

                if not date_str:
                    # Undated exhibition — use today as start
                    if any(w in text.lower() for w in ("through", "until", "ongoing", "now on view")):
                        date_str = TODAY.strftime("%Y-%m-%d")
                    else:
                        continue

                link = card.find("a", href=True)
                ev_url = url
                if link:
                    href = link["href"]
                    if href.startswith("http"):
                        ev_url = href
                    elif href.startswith("/"):
                        from urllib.parse import urlparse
                        base = urlparse(url)
                        ev_url = f"{base.scheme}://{base.netloc}{href}"

                # Detect event type from text
                etype = "exhibition"
                tl = text.lower()
                if any(w in tl for w in ("film", "screening", "cinema")):
                    etype = "screening"
                elif any(w in tl for w in ("concert", "music", "performance", "recital")):
                    etype = "performance"
                elif any(w in tl for w in ("lecture", "talk", "panel", "discussion")):
                    etype = "lecture"
                elif any(w in tl for w in ("family", "kids", "children")):
                    etype = "family"

                events.append(make_event(
                    title=title,
                    date_str=date_str,
                    venue=name,
                    neighborhood=neighborhood,
                    borough=borough,
                    url=ev_url,
                    description=text[:300],
                    source=f"museum_scraper_{slug}",
                    event_type=etype,
                    is_featured=etype == "exhibition",
                ))

        time.sleep(2)

    return events


# ── Recurring free nights ─────────────────────────────────

FREE_RECURRING = [
    {"museum": "MoMA", "neighborhood": "Midtown", "day": "friday",
     "time": "4:00 PM", "end": "8:00 PM",
     "title": "MoMA Free Friday Nights (UNIQLO)",
     "desc": "Free admission every Friday 4-8 PM. Sponsored by UNIQLO.",
     "url": "https://www.moma.org/visit/"},
    {"museum": "Whitney Museum", "neighborhood": "Meatpacking District", "day": "friday",
     "time": "7:00 PM", "end": "10:00 PM",
     "title": "Whitney Free Friday Evenings",
     "desc": "Free admission every Friday 7-10 PM.",
     "url": "https://whitney.org/visit"},
    {"museum": "New Museum", "neighborhood": "Lower East Side", "day": "thursday",
     "time": "7:00 PM", "end": "9:00 PM",
     "title": "New Museum Free Thursday Nights",
     "desc": "Free admission every Thursday 7-9 PM.",
     "url": "https://www.newmuseum.org/visit"},
    {"museum": "Brooklyn Museum", "neighborhood": "Prospect Heights", "day": "first_saturday",
     "time": "5:00 PM", "end": "11:00 PM",
     "title": "Brooklyn Museum First Saturdays",
     "desc": "Free admission with live music, dance, film, talks. First Saturday of every month.",
     "url": "https://www.brooklynmuseum.org/visit/first_saturdays",
     "borough": "Brooklyn"},
    {"museum": "Cooper Hewitt", "neighborhood": "Upper East Side", "day": "saturday",
     "time": "6:00 PM", "end": "9:00 PM",
     "title": "Cooper Hewitt Free Saturday Nights",
     "desc": "Pay-what-you-wish every Saturday 6-9 PM.",
     "url": "https://www.cooperhewitt.org/visit/"},
    {"museum": "Rubin Museum", "neighborhood": "Chelsea", "day": "friday",
     "time": "6:00 PM", "end": "10:00 PM",
     "title": "Rubin Museum K2 Fridays",
     "desc": "Free admission every Friday 6-10 PM with live music and performances.",
     "url": "https://rubinmuseum.org/visit"},
    {"museum": "Jewish Museum", "neighborhood": "Upper East Side", "day": "saturday",
     "time": "11:00 AM", "end": "6:00 PM",
     "title": "Jewish Museum Free Saturdays",
     "desc": "Free admission every Saturday.",
     "url": "https://thejewishmuseum.org/visit"},
    {"museum": "NY Historical Society", "neighborhood": "Upper West Side", "day": "friday",
     "time": "6:00 PM", "end": "8:00 PM",
     "title": "NY Historical Society Free Friday Nights",
     "desc": "Free admission every Friday 6-8 PM.",
     "url": "https://www.nyhistory.org/visit"},
    {"museum": "The Morgan Library", "neighborhood": "Murray Hill", "day": "friday",
     "time": "7:00 PM", "end": "9:00 PM",
     "title": "Morgan Library Free Friday Nights",
     "desc": "Free admission every Friday 7-9 PM.",
     "url": "https://www.themorgan.org/visit"},
    {"museum": "Museum of Arts and Design", "neighborhood": "Columbus Circle", "day": "thursday",
     "time": "6:00 PM", "end": "9:00 PM",
     "title": "MAD Free Thursday Nights",
     "desc": "Pay-what-you-wish every Thursday 6-9 PM.",
     "url": "https://madmuseum.org/visit"},
    {"museum": "Guggenheim", "neighborhood": "Upper East Side", "day": "saturday",
     "time": "4:00 PM", "end": "6:00 PM",
     "title": "Guggenheim Pay-What-You-Wish Saturdays",
     "desc": "Pay-what-you-wish every Saturday 4-6 PM.",
     "url": "https://www.guggenheim.org/plan-your-visit"},
    {"museum": "The Frick Collection", "neighborhood": "Upper East Side", "day": "first_friday",
     "time": "4:00 PM", "end": "6:00 PM",
     "title": "Frick Pay-What-You-Wish First Fridays",
     "desc": "Pay-what-you-wish first Friday of every month.",
     "url": "https://www.frick.org/visit"},
]


def generate_recurring_events():
    """Generate individual events for each occurrence of recurring free nights."""
    logger.info("  Generating recurring free museum nights...")
    events = []
    start = datetime.combine(TODAY, datetime.min.time())
    end = datetime.combine(MAX_DATE, datetime.min.time())

    for rec in FREE_RECURRING:
        day = rec["day"]
        dates = []

        if day == "first_saturday":
            # First Saturday of each month
            current = start.replace(day=1)
            while current <= end:
                # Find first Saturday
                d = current
                while d.weekday() != 5:  # Saturday
                    d += timedelta(days=1)
                if start <= d <= end:
                    dates.append(d.date())
                # Next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)

        elif day == "first_friday":
            current = start.replace(day=1)
            while current <= end:
                d = current
                while d.weekday() != 4:  # Friday
                    d += timedelta(days=1)
                if start <= d <= end:
                    dates.append(d.date())
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)

        else:
            # Weekly recurring
            day_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
                       "friday": 4, "saturday": 5, "sunday": 6}
            weekday = day_map.get(day, 4)
            d = start
            while d <= end:
                if d.weekday() == weekday and d.date() >= TODAY:
                    dates.append(d.date())
                d += timedelta(days=1)

        for dt in dates:
            events.append(make_event(
                title=rec["title"],
                date_str=dt.strftime("%Y-%m-%d"),
                time_str=rec["time"],
                end_time=rec["end"],
                venue=rec["museum"],
                neighborhood=rec["neighborhood"],
                borough=rec.get("borough", "Manhattan"),
                cost="Free",
                is_free=True,
                url=rec["url"],
                description=rec["desc"],
                source="museum_scraper_recurring",
                event_type="free_night",
            ))

    logger.info(f"    Recurring free nights: {len(events)} events")
    return events


# ── All museums ────────────────────────────────────────────

MUSEUMS = [
    ("The Metropolitan Museum of Art",
     ["https://www.metmuseum.org/exhibitions", "https://www.metmuseum.org/events"],
     "Upper East Side", "Manhattan", "met"),
    ("Whitney Museum",
     ["https://whitney.org/exhibitions", "https://whitney.org/events"],
     "Meatpacking District", "Manhattan", "whitney"),
    ("Guggenheim",
     ["https://www.guggenheim.org/exhibitions"],
     "Upper East Side", "Manhattan", "guggenheim"),
    ("American Museum of Natural History",
     ["https://www.amnh.org/exhibitions"],
     "Upper West Side", "Manhattan", "amnh"),
    ("Brooklyn Museum",
     ["https://www.brooklynmuseum.org/exhibitions"],
     "Prospect Heights", "Brooklyn", "brooklyn_museum"),
    ("New Museum",
     ["https://www.newmuseum.org/exhibitions"],
     "Lower East Side", "Manhattan", "new_museum"),
    ("Museum of the City of New York",
     ["https://www.mcny.org/exhibitions"],
     "East Harlem", "Manhattan", "mcny"),
    ("International Center of Photography",
     ["https://www.icp.org/exhibitions"],
     "Lower East Side", "Manhattan", "icp"),
    ("Museum of Arts and Design",
     ["https://madmuseum.org/events"],
     "Columbus Circle", "Manhattan", "mad"),
    ("The Morgan Library",
     ["https://www.themorgan.org/exhibitions"],
     "Murray Hill", "Manhattan", "morgan"),
    ("New York Historical Society",
     ["https://www.nyhistory.org/exhibitions"],
     "Upper West Side", "Manhattan", "nyhistory"),
    ("Museum of the Moving Image",
     ["https://movingimage.us/calendar/"],
     "Astoria", "Queens", "momi"),
]


def scrape_all_museums():
    """Scrape exhibitions and events from all museums."""
    all_events = []
    source_counts = {}

    for name, urls, hood, borough, slug in MUSEUMS:
        try:
            logger.info(f"  Scraping {name}...")
            evts = scrape_museum_site(name, urls, hood, borough, slug)
            source_counts[slug] = len(evts)
            all_events.extend(evts)
        except Exception as e:
            logger.error(f"    {name} failed: {e}")
            source_counts[slug] = f"ERROR: {e}"

    return all_events, source_counts


# ── Dedup ──────────────────────────────────────────────────

def deduplicate(events):
    unique = []
    for ev in events:
        is_dup = False
        for u in unique:
            if ev["date"] != u["date"]:
                continue
            score = fuzz.token_sort_ratio(ev["title"].lower(), u["title"].lower())
            if score >= 85:
                is_dup = True
                break
        if not is_dup:
            unique.append(ev)
    removed = len(events) - len(unique)
    if removed:
        logger.info(f"  Dedup: removed {removed} duplicates")
    return unique


# ── Google Calendar Push ───────────────────────────────────

def push_to_gcal(events):
    logger.info("  Pushing to Google Calendar...")
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials.from_authorized_user_file(GCAL_TOKEN)
        if not creds.valid and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(GCAL_TOKEN, "w") as f:
                f.write(creds.to_json())
        service = build("calendar", "v3", credentials=creds)
    except Exception as e:
        logger.error(f"  GCal auth failed: {e}")
        return {"created": 0, "skipped": 0, "errors": 0}

    created = skipped = errors = 0

    for ev in events:
        try:
            if ev.get("time"):
                dt = dateparser.parse(f"{ev['date']} {ev['time']}")
            else:
                dt = dateparser.parse(ev["date"])
            if not dt:
                skipped += 1
                continue

            end_dt = dt + timedelta(hours=2)
            if ev.get("end_time"):
                end_dt = dateparser.parse(f"{ev['date']} {ev['end_time']}") or end_dt

            # Dupe check
            tmin = dt.strftime("%Y-%m-%dT00:00:00-04:00")
            tmax = dt.strftime("%Y-%m-%dT23:59:59-04:00")
            existing = service.events().list(
                calendarId=MUSEUM_CAL_ID, timeMin=tmin, timeMax=tmax,
                q=ev["title"][:50], singleEvents=True, maxResults=3,
            ).execute()
            if any(e.get("summary", "").lower().strip() == ev["title"].lower().strip()
                   for e in existing.get("items", [])):
                skipped += 1
                continue

            body = {
                "summary": ev["title"],
                "start": {"dateTime": dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "end": {"dateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "location": f"{ev['venue']}, {ev['neighborhood']}",
                "description": f"Category: Museum\nVenue: {ev['venue']}\nType: {ev.get('event_type','')}\nFree: {'Yes' if ev['is_free'] else 'No'}\n\n{ev.get('description','')}\n\nInfo: {ev.get('url','')}",
                "colorId": "2",
            }
            service.events().insert(calendarId=MUSEUM_CAL_ID, body=body).execute()
            created += 1
            time.sleep(0.3)
        except Exception as e:
            errors += 1
            if errors <= 5:
                logger.warning(f"  GCal error: {e}")

    logger.info(f"  GCal: {created} created, {skipped} skipped, {errors} errors")
    return {"created": created, "skipped": skipped, "errors": errors}


# ── Supabase Push ──────────────────────────────────────────

def push_to_supabase(events):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    manual = supabase.table("events").select("title,date").eq("source", "manual_curated").eq("category", "Museum").execute()
    manual_keys = {(r["title"].lower().strip(), r["date"]) for r in (manual.data or [])}

    created = skipped = errors = 0
    for ev in events:
        if (ev["title"].lower().strip(), ev["date"]) in manual_keys:
            skipped += 1
            continue
        try:
            supabase.table("events").upsert({
                "title": ev["title"],
                "date": ev["date"],
                "time": ev.get("time"),
                "end_time": ev.get("end_time"),
                "venue": ev["venue"],
                "neighborhood": ev.get("neighborhood"),
                "borough": ev.get("borough"),
                "category": "Museum",
                "cost": ev.get("cost"),
                "is_free": ev.get("is_free", False),
                "url": ev.get("url"),
                "description": ev.get("description"),
                "source": ev["source"],
                "event_type": ev.get("event_type"),
                "is_featured": ev.get("is_featured", False),
            }, on_conflict="title,date,venue").execute()
            created += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                logger.warning(f"  Supabase error: {e}")

    logger.info(f"  Supabase: {created} upserted, {skipped} skipped, {errors} errors")
    return {"upserted": created, "skipped": skipped, "errors": errors}


# ── Main ───────────────────────────────────────────────────

def scrape_all_museum_events():
    logger.info("=== MUSEUM EVENTS SCRAPER ===")

    # 1. Scrape museum websites
    museum_events, source_counts = scrape_all_museums()
    logger.info(f"  Scraped from websites: {len(museum_events)}")

    # 2. Generate recurring free nights
    recurring = generate_recurring_events()

    # Combine
    all_events = museum_events + recurring
    logger.info(f"  Total (scraped + recurring): {len(all_events)}")

    for src, count in source_counts.items():
        logger.info(f"    {src}: {count}")
    logger.info(f"    recurring: {len(recurring)}")

    # 3. Dedup
    unique = deduplicate(all_events)
    logger.info(f"  After dedup: {len(unique)}")

    # 4. Push
    gcal = push_to_gcal(unique)
    supa = push_to_supabase(unique)

    # 5. Report by type
    type_counts = {}
    free_count = 0
    for e in unique:
        t = e.get("event_type", "event")
        type_counts[t] = type_counts.get(t, 0) + 1
        if e.get("is_free"):
            free_count += 1

    logger.info(f"\n  By event_type:")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        logger.info(f"    {t}: {c}")
    logger.info(f"  Free events: {free_count}")

    results = {
        "scraped_websites": len(museum_events),
        "recurring_generated": len(recurring),
        "unique": len(unique),
        "sources": source_counts,
        "by_type": type_counts,
        "free_count": free_count,
        "gcal": gcal,
        "supabase": supa,
    }

    logger.info(f"=== MUSEUM SCRAPER COMPLETE ===")
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_museum_events()
