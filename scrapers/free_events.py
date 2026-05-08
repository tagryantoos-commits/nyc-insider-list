"""Scrape and generate free events for NYC.

Generates recurring free museum nights + scrapes Eventbrite free events.
Regenerated weekly so dates always stay current.
"""

import json
import logging
import os
import sys
import time
from datetime import date, timedelta

import requests as http_requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

TODAY = date.today()
MAX_DATE = TODAY + timedelta(days=90)

FREE_RECURRING = [
    ("MoMA Free Friday Nights", "MoMA", "Midtown", 4, "4:00 PM", "8:00 PM",
     "Free admission every Friday 4-8 PM. Sponsored by UNIQLO."),
    ("Whitney Free Friday Evenings", "Whitney Museum", "Meatpacking District", 4, "7:00 PM", "10:00 PM",
     "Free admission every Friday 7-10 PM."),
    ("New Museum Free Thursday Nights", "New Museum", "Lower East Side", 3, "7:00 PM", "9:00 PM",
     "Free admission every Thursday 7-9 PM."),
    ("Guggenheim PWYW Saturdays", "Guggenheim", "Upper East Side", 5, "4:00 PM", "6:00 PM",
     "Pay-what-you-wish every Saturday 4-6 PM."),
    ("Cooper Hewitt Free Saturday Nights", "Cooper Hewitt", "Upper East Side", 5, "6:00 PM", "9:00 PM",
     "Pay-what-you-wish every Saturday 6-9 PM."),
    ("Rubin Museum K2 Fridays", "Rubin Museum", "Chelsea", 4, "6:00 PM", "10:00 PM",
     "Free admission every Friday 6-10 PM with live music."),
    ("Jewish Museum Free Saturdays", "Jewish Museum", "Upper East Side", 5, "11:00 AM", "6:00 PM",
     "Free admission every Saturday."),
    ("NY Historical Free Friday Nights", "NY Historical Society", "Upper West Side", 4, "6:00 PM", "8:00 PM",
     "Free admission every Friday 6-8 PM."),
    ("Morgan Library Free Friday Nights", "Morgan Library", "Murray Hill", 4, "7:00 PM", "9:00 PM",
     "Free admission every Friday 7-9 PM."),
    ("MAD Free Thursday Nights", "Museum of Arts and Design", "Columbus Circle", 3, "6:00 PM", "9:00 PM",
     "Pay-what-you-wish every Thursday 6-9 PM."),
]


def generate_recurring():
    """Generate individual events for each recurring free night through 90 days."""
    logger.info("  Generating recurring free nights...")
    events = []

    for title, venue, hood, weekday, start, end, desc in FREE_RECURRING:
        d = TODAY
        count = 0
        while d <= MAX_DATE and count < 13:
            if d.weekday() == weekday:
                events.append({
                    "title": title, "date": d.strftime("%Y-%m-%d"),
                    "time": start, "end_time": end,
                    "venue": venue, "neighborhood": hood,
                    "source": "free_recurring", "description": desc,
                })
                count += 1
            d += timedelta(days=1)

    # Brooklyn Museum First Saturdays
    d = TODAY.replace(day=1)
    for _ in range(4):
        first = d
        while first.weekday() != 5:
            first += timedelta(days=1)
        if TODAY <= first <= MAX_DATE:
            events.append({
                "title": "Brooklyn Museum First Saturdays",
                "date": first.strftime("%Y-%m-%d"),
                "time": "5:00 PM", "end_time": "11:00 PM",
                "venue": "Brooklyn Museum", "neighborhood": "Prospect Heights",
                "source": "free_recurring",
                "description": "Free admission with live music, dance, film, talks.",
            })
        if d.month == 12:
            d = d.replace(year=d.year + 1, month=1)
        else:
            d = d.replace(month=d.month + 1)

    logger.info(f"    Recurring: {len(events)} events")
    return events


def scrape_eventbrite_free():
    """Scrape free events from Eventbrite."""
    logger.info("  Scraping Eventbrite free events...")
    events = []

    for query in ["free-events", "free-things-to-do", "free"]:
        url = f"https://www.eventbrite.com/d/ny--new-york/{query}/"
        try:
            resp = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
            soup = BeautifulSoup(resp.text, "lxml")
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string)
                    if not isinstance(data, dict) or data.get("@type") != "ItemList":
                        continue
                    for elem in data.get("itemListElement", []):
                        item = elem.get("item", elem)
                        if item.get("@type") != "Event":
                            continue
                        offers = item.get("offers", {})
                        is_free = False
                        if isinstance(offers, dict):
                            is_free = str(offers.get("price", "")) in ("0", "0.00", "")
                        if not is_free:
                            continue
                        try:
                            dt = dateparser.parse(item.get("startDate", ""))
                            if not dt or dt.date() < TODAY or dt.date() > MAX_DATE:
                                continue
                        except:
                            continue
                        loc = item.get("location", {})
                        events.append({
                            "title": item.get("name", ""),
                            "date": dt.strftime("%Y-%m-%d"),
                            "time": dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            "venue": loc.get("name", "") if isinstance(loc, dict) else "",
                            "source": "free_eventbrite",
                            "url": item.get("url", ""),
                            "description": (item.get("description", "") or "")[:300],
                        })
                except:
                    continue
        except Exception as e:
            logger.warning(f"    Eventbrite error: {e}")
        time.sleep(2)

    logger.info(f"    Eventbrite free: {len(events)} events")
    return events


def push_to_supabase(events):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Delete old recurring free events (they get regenerated with fresh dates)
    supabase.table("events").delete().eq("source", "free_recurring").eq("category", "Free Event").execute()

    created = errors = 0
    for ev in events:
        try:
            supabase.table("events").upsert({
                "title": ev["title"],
                "date": ev["date"],
                "time": ev.get("time"),
                "end_time": ev.get("end_time"),
                "venue": ev.get("venue", ""),
                "neighborhood": ev.get("neighborhood"),
                "category": "Free Event",
                "cost": "Free",
                "is_free": True,
                "url": ev.get("url", ""),
                "description": ev.get("description", ""),
                "source": ev.get("source"),
            }, on_conflict="title,date,venue").execute()
            created += 1
        except:
            errors += 1

    logger.info(f"  Supabase: {created} upserted, {errors} errors")

    r = supabase.table("events").select("id", count="exact").eq("category", "Free Event").execute()
    logger.info(f"  Total Free Event in DB: {r.count}")
    return {"upserted": created, "errors": errors, "total": r.count}


def scrape_all_free_events():
    logger.info("=== FREE EVENTS SCRAPER ===")
    recurring = generate_recurring()
    eventbrite = scrape_eventbrite_free()
    all_events = recurring + eventbrite
    result = push_to_supabase(all_events)
    result["scraped"] = len(all_events)
    logger.info(f"=== FREE EVENTS COMPLETE: {len(all_events)} events ===")
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_free_events()
