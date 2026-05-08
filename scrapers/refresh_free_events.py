"""One-off: populate Free Event category with recurring free nights + Eventbrite free events."""
import json, os, sys, time, requests, logging
from datetime import date, timedelta, datetime
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TODAY = date.today()
MAX_DATE = TODAY + timedelta(days=90)
events = []

# 1. Eventbrite free events
logger.info("Scraping Eventbrite free events...")
for query in ["free-events", "free-things-to-do", "free"]:
    url = f"https://www.eventbrite.com/d/ny--new-york/{query}/"
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
        soup = BeautifulSoup(resp.text, "lxml")
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
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
        logger.warning(f"  Eventbrite error: {e}")
    time.sleep(2)

logger.info(f"  Eventbrite free: {len(events)}")

# 2. Recurring free museum nights
logger.info("Generating recurring free nights...")
free_nights = [
    ("MoMA Free Friday Nights", "MoMA", "Midtown", 4, "4:00 PM", "8:00 PM"),
    ("Whitney Free Friday Evenings", "Whitney Museum", "Meatpacking District", 4, "7:00 PM", "10:00 PM"),
    ("New Museum Free Thursday Nights", "New Museum", "Lower East Side", 3, "7:00 PM", "9:00 PM"),
    ("Guggenheim PWYW Saturdays", "Guggenheim", "Upper East Side", 5, "4:00 PM", "6:00 PM"),
    ("Cooper Hewitt Free Saturday Nights", "Cooper Hewitt", "Upper East Side", 5, "6:00 PM", "9:00 PM"),
    ("Rubin Museum K2 Fridays", "Rubin Museum", "Chelsea", 4, "6:00 PM", "10:00 PM"),
    ("Jewish Museum Free Saturdays", "Jewish Museum", "Upper East Side", 5, "11:00 AM", "6:00 PM"),
    ("NY Historical Free Friday Nights", "NY Historical Society", "Upper West Side", 4, "6:00 PM", "8:00 PM"),
    ("Morgan Library Free Friday Nights", "Morgan Library", "Murray Hill", 4, "7:00 PM", "9:00 PM"),
    ("MAD Free Thursday Nights", "Museum of Arts and Design", "Columbus Circle", 3, "6:00 PM", "9:00 PM"),
    ("SummerStage Free Concerts", "Central Park SummerStage", "Central Park", 5, "6:00 PM", "9:00 PM"),
    ("Bryant Park Movie Nights", "Bryant Park", "Midtown", 0, "8:00 PM", "10:00 PM"),
    ("Shakespeare in the Park", "Delacorte Theater", "Central Park", 1, "8:00 PM", "10:30 PM"),
]

for title, venue, hood, weekday, start, end in free_nights:
    d = TODAY
    count = 0
    while d <= MAX_DATE and count < 13:
        if d.weekday() == weekday and d >= TODAY:
            events.append({
                "title": title,
                "date": d.strftime("%Y-%m-%d"),
                "time": start,
                "end_time": end,
                "venue": venue,
                "neighborhood": hood,
                "source": "free_recurring",
                "description": f"Free admission. {title}.",
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

logger.info(f"  Total free events: {len(events)}")

# Upsert
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

logger.info(f"Upserted: {created}, Errors: {errors}")

r = supabase.table("events").select("id", count="exact").eq("category", "Free Event").execute()
logger.info(f"Total Free Event in DB: {r.count}")
