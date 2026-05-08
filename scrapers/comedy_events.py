"""Scrape comedy events from NYC venues and Eventbrite.

Pushes to NYC - Comedy Google Calendar + Supabase events table.
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
from thefuzz import fuzz

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

GCAL_TOKEN = os.path.join(os.path.dirname(__file__), "..", "..", "nyc-events-calendar", "token.json")
COMEDY_CAL_ID = "c_a8f0bbf09e1d0ab901d4275555b488ad6d6fe19f6d76bf9e4cc29d85f43a7c9a@group.calendar.google.com"

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
               neighborhood="", cost="", is_free=False, url="",
               description="", source=""):
    return {
        "title": title.strip(),
        "date": date_str,
        "time": time_str,
        "end_time": end_time,
        "venue": venue,
        "neighborhood": neighborhood,
        "borough": "Manhattan",
        "category": "Comedy",
        "cost": cost,
        "is_free": is_free,
        "url": url,
        "description": description[:500] if description else "",
        "source": source,
        "event_type": "comedy",
        "is_featured": False,
    }


# ── Venue scrapers ─────────────────────────────────────────

COMEDY_VENUES = [
    {
        "name": "Comedy Cellar",
        "urls": ["https://www.comedycellar.com/schedule/"],
        "neighborhood": "Greenwich Village",
        "slug": "comedy_cellar",
    },
    {
        "name": "Gotham Comedy Club",
        "urls": ["https://gothamcomedyclub.com/calendar"],
        "neighborhood": "Chelsea",
        "slug": "gotham",
    },
    {
        "name": "The Stand NYC",
        "urls": ["https://www.thestandnyc.com/events/"],
        "neighborhood": "Gramercy",
        "slug": "the_stand",
    },
    {
        "name": "Caroline's on Broadway",
        "urls": ["https://www.carolines.com/calendar/"],
        "neighborhood": "Times Square",
        "slug": "carolines",
    },
    {
        "name": "Caveat NYC",
        "urls": ["https://www.caveat.nyc/events"],
        "neighborhood": "Lower East Side",
        "slug": "caveat",
    },
    {
        "name": "New York Comedy Club",
        "urls": ["https://newyorkcomedyclub.com/schedule"],
        "neighborhood": "East Village",
        "slug": "nycc",
    },
]


def scrape_venue(venue_info):
    """Generic venue scraper: tries JSON-LD, then HTML cards."""
    name = venue_info["name"]
    hood = venue_info["neighborhood"]
    slug = venue_info["slug"]
    events = []

    for url in venue_info["urls"]:
        soup = fetch(url)
        if not soup or len(soup.get_text()) < 300:
            soup = fetch_playwright(url, wait_selector="article, .event, h3, h2, [class*='show']")
        if not soup:
            continue

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") in ("Event", "ComedyEvent"):
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        events.append(make_event(
                            title=item.get("name", ""),
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=name,
                            neighborhood=hood,
                            url=item.get("url", url),
                            description=item.get("description", ""),
                            source=f"comedy_{slug}",
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        # HTML cards
        if not any(e["source"] == f"comedy_{slug}" for e in events):
            for card in soup.select("article, .event, [class*='event'], [class*='show'], .listing, li"):
                title_el = card.select_one("h2, h3, h4, .title, a, strong")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                if not title or len(title) < 3 or len(title) > 120:
                    continue
                if title.lower() in ("shows", "events", "calendar", "tickets"):
                    continue

                text = card.get_text(" ", strip=True)
                dt = parse_date_safe(text)
                if not dt:
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

                # Extract time
                time_match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))', text)
                time_str = time_match.group(1) if time_match else None

                events.append(make_event(
                    title=title,
                    date_str=dt.strftime("%Y-%m-%d"),
                    time_str=time_str,
                    venue=name,
                    neighborhood=hood,
                    url=ev_url,
                    description=text[:200],
                    source=f"comedy_{slug}",
                ))

        time.sleep(2)

    return events


# ── Eventbrite comedy ──────────────────────────────────────

def scrape_eventbrite_comedy():
    logger.info("  Scraping Eventbrite comedy...")
    events = []

    for query in ["comedy", "stand-up-comedy", "comedy-show"]:
        url = f"https://www.eventbrite.com/d/ny--new-york/{query}/"
        soup = fetch(url)
        if not soup:
            continue

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    for elem in data.get("itemListElement", []):
                        item = elem.get("item", elem)
                        if item.get("@type") != "Event":
                            continue
                        name = item.get("name", "")
                        if not any(w in name.lower() for w in ("comedy", "stand-up", "standup", "improv", "comedian", "open mic", "laugh")):
                            continue
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        loc = item.get("location", {})
                        venue = loc.get("name", "") if isinstance(loc, dict) else ""
                        events.append(make_event(
                            title=name,
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=venue,
                            url=item.get("url", ""),
                            description=item.get("description", "")[:300],
                            source="comedy_eventbrite",
                        ))
            except (json.JSONDecodeError, TypeError):
                continue
        time.sleep(2)

    logger.info(f"    Eventbrite comedy: {len(events)} events")
    return events


# ── Dedup + Push (same as other scrapers) ──────────────────

def deduplicate(events):
    unique = []
    for ev in events:
        is_dup = False
        for u in unique:
            if ev["date"] != u["date"]:
                continue
            if fuzz.token_sort_ratio(ev["title"].lower(), u["title"].lower()) >= 85:
                is_dup = True
                break
        if not is_dup:
            unique.append(ev)
    removed = len(events) - len(unique)
    if removed:
        logger.info(f"  Dedup: removed {removed} duplicates")
    return unique


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
            dt = dateparser.parse(f"{ev['date']} {ev['time']}") if ev.get("time") else dateparser.parse(ev["date"])
            if not dt:
                skipped += 1
                continue
            end_dt = dt + timedelta(hours=2)

            tmin = dt.strftime("%Y-%m-%dT00:00:00-04:00")
            tmax = dt.strftime("%Y-%m-%dT23:59:59-04:00")
            existing = service.events().list(
                calendarId=COMEDY_CAL_ID, timeMin=tmin, timeMax=tmax,
                q=ev["title"][:50], singleEvents=True, maxResults=3,
            ).execute()
            if any(e.get("summary", "").lower().strip() == ev["title"].lower().strip()
                   for e in existing.get("items", [])):
                skipped += 1
                continue

            service.events().insert(calendarId=COMEDY_CAL_ID, body={
                "summary": ev["title"],
                "start": {"dateTime": dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "end": {"dateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "location": f"{ev['venue']}, {ev['neighborhood']}" if ev.get("neighborhood") else ev["venue"],
                "description": f"Category: Comedy\nVenue: {ev['venue']}\n\n{ev.get('description','')}\n\nInfo: {ev.get('url','')}",
                "colorId": "7",
            }).execute()
            created += 1
            time.sleep(0.3)
        except Exception as e:
            errors += 1
            if errors <= 5:
                logger.warning(f"  GCal error: {e}")

    logger.info(f"  GCal: {created} created, {skipped} skipped, {errors} errors")
    return {"created": created, "skipped": skipped, "errors": errors}


def push_to_supabase(events):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    created = errors = 0
    for ev in events:
        try:
            supabase.table("events").upsert({
                "title": ev["title"],
                "date": ev["date"],
                "time": ev.get("time"),
                "end_time": ev.get("end_time"),
                "venue": ev["venue"],
                "neighborhood": ev.get("neighborhood"),
                "borough": ev.get("borough", "Manhattan"),
                "category": "Comedy",
                "cost": ev.get("cost"),
                "is_free": ev.get("is_free", False),
                "url": ev.get("url"),
                "description": ev.get("description"),
                "source": ev["source"],
                "event_type": "comedy",
            }, on_conflict="title,date,venue").execute()
            created += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                logger.warning(f"  Supabase error: {e}")

    logger.info(f"  Supabase: {created} upserted, {errors} errors")
    return {"upserted": created, "errors": errors}


def scrape_all_comedy_events():
    logger.info("=== COMEDY EVENTS SCRAPER ===")

    all_events = []
    source_counts = {}

    # Venue scrapers
    for venue in COMEDY_VENUES:
        try:
            logger.info(f"  Scraping {venue['name']}...")
            evts = scrape_venue(venue)
            source_counts[venue["slug"]] = len(evts)
            all_events.extend(evts)
        except Exception as e:
            logger.error(f"  {venue['name']} failed: {e}")
            source_counts[venue["slug"]] = f"ERROR: {e}"

    # Eventbrite
    try:
        eb = scrape_eventbrite_comedy()
        source_counts["eventbrite"] = len(eb)
        all_events.extend(eb)
    except Exception as e:
        logger.error(f"  Eventbrite comedy failed: {e}")
        source_counts["eventbrite"] = f"ERROR: {e}"

    logger.info(f"  Total scraped: {len(all_events)}")
    for src, count in source_counts.items():
        logger.info(f"    {src}: {count}")

    unique = deduplicate(all_events)
    logger.info(f"  After dedup: {len(unique)}")

    gcal = push_to_gcal(unique)
    supa = push_to_supabase(unique)

    results = {
        "scraped": len(all_events),
        "unique": len(unique),
        "sources": source_counts,
        "gcal": gcal,
        "supabase": supa,
    }
    logger.info(f"=== COMEDY SCRAPER COMPLETE ===")
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_comedy_events()
