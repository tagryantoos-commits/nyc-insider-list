"""Scrape kid-friendly / family events from NYC sources.

Pushes to NYC - Kid-Friendly Google Calendar + Supabase events table.
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
KID_CAL_ID = "c_961dc48373684ed57111601505449dc021a7e30934272e740f5af633a3256953@group.calendar.google.com"

TODAY = date.today()
MAX_DATE = TODAY + timedelta(days=90)

KID_KEYWORDS = {"kid", "kids", "children", "family", "families", "toddler", "baby",
                "child-friendly", "all ages", "puppet", "storytime", "story time"}


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


def classify_borough(venue, neighborhood):
    text = f"{venue or ''} {neighborhood or ''}".lower()
    if "brooklyn" in text:
        return "Brooklyn"
    if "queens" in text:
        return "Queens"
    if "bronx" in text:
        return "Bronx"
    bk = ["williamsburg", "bushwick", "dumbo", "park slope", "prospect", "brooklyn"]
    if any(n in text for n in bk):
        return "Brooklyn"
    qn = ["astoria", "flushing", "corona", "queens"]
    if any(n in text for n in qn):
        return "Queens"
    return "Manhattan"


def make_event(title, date_str, time_str=None, end_time=None, venue="",
               neighborhood="", cost="", is_free=False, url="",
               description="", source="", age_range=None, is_featured=False):
    return {
        "title": title.strip(),
        "date": date_str,
        "time": time_str,
        "end_time": end_time,
        "venue": venue,
        "neighborhood": neighborhood,
        "borough": classify_borough(venue, neighborhood),
        "category": "Kid-Friendly",
        "cost": cost,
        "is_free": is_free,
        "url": url,
        "description": description[:500] if description else "",
        "source": source,
        "age_range": age_range,
        "is_featured": is_featured,
    }


def extract_age_range(text):
    t = text.lower()
    if "toddler" in t or "0-3" in t or "ages 0" in t:
        return "Toddlers"
    if "teen" in t or "13-" in t or "12-17" in t:
        return "Teens"
    m = re.search(r'ages?\s*(\d+)\s*[-–to]+\s*(\d+)', t, re.IGNORECASE)
    if m:
        return f"Ages {m.group(1)}-{m.group(2)}"
    m2 = re.search(r'ages?\s*(\d+)\+', t, re.IGNORECASE)
    if m2:
        return f"Ages {m2.group(1)}+"
    if "all ages" in t:
        return "All ages"
    return None


# ── Source 1: Mommy Poppins ────────────────────────────────

def scrape_mommypoppins():
    logger.info("  Scraping Mommy Poppins...")
    events = []

    for url in [
        "https://mommypoppins.com/new-york-city-kids/events",
        "https://mommypoppins.com/new-york-city-kids/events/this-weekend",
    ]:
        soup = fetch(url)
        if not soup:
            soup = fetch_playwright(url, wait_selector="article, .event, h3")
        if not soup:
            continue

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") == "Event":
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        loc = item.get("location", {})
                        events.append(make_event(
                            title=item.get("name", ""),
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=loc.get("name", "") if isinstance(loc, dict) else "",
                            url=item.get("url", url),
                            description=item.get("description", ""),
                            source="mommypoppins",
                            age_range=extract_age_range(item.get("description", "")),
                            is_free="free" in json.dumps(item).lower(),
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        # HTML cards
        if not events:
            for card in soup.select("article, .event-card, .views-row, .node--event, [class*='event']"):
                title_el = card.select_one("h2, h3, h4, .title, a")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                if not title or len(title) < 5 or len(title) > 120:
                    continue

                text = card.get_text(" ", strip=True)
                dt = parse_date_safe(text)
                if not dt:
                    continue

                link = card.find("a", href=True)
                ev_url = ""
                if link:
                    href = link["href"]
                    ev_url = href if href.startswith("http") else f"https://mommypoppins.com{href}"

                events.append(make_event(
                    title=title,
                    date_str=dt.strftime("%Y-%m-%d"),
                    venue="",
                    url=ev_url,
                    description=text[:300],
                    source="mommypoppins",
                    age_range=extract_age_range(text),
                    is_free="free" in text.lower(),
                ))

        time.sleep(2)

    logger.info(f"    Mommy Poppins: {len(events)} events")
    return events


# ── Source 2: NYC Parks ────────────────────────────────────

def scrape_nycparks_kids():
    logger.info("  Scraping NYC Parks (kids)...")
    events = []

    soup = fetch_playwright(
        "https://www.nycgovparks.org/events",
        wait_selector="div.event, h3",
    )
    if not soup:
        return events

    for card in soup.select("div.event, [class*='event']"):
        text = card.get_text(" ", strip=True).lower()
        # Only include family/kid events
        if not any(kw in text for kw in KID_KEYWORDS):
            continue

        title_el = card.select_one("h3, h2, a")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title or len(title) < 5:
            continue

        full_text = card.get_text(" ", strip=True)
        dt = parse_date_safe(full_text)
        if not dt:
            continue

        link = card.find("a", href=True)
        ev_url = ""
        if link:
            href = link["href"]
            ev_url = href if href.startswith("http") else f"https://www.nycgovparks.org{href}"

        events.append(make_event(
            title=title,
            date_str=dt.strftime("%Y-%m-%d"),
            url=ev_url,
            description=full_text[:300],
            source="nycparks",
            is_free=True,
            cost="Free",
            age_range=extract_age_range(full_text) or "All ages",
        ))

    logger.info(f"    NYC Parks: {len(events)} events")
    return events


# ── Source 3: Eventbrite ───────────────────────────────────

def scrape_eventbrite_kids():
    logger.info("  Scraping Eventbrite (kids/family)...")
    events = []

    for query in ["kids", "family"]:
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
                        desc = item.get("description", "")
                        combined = (name + " " + desc).lower()
                        if not any(kw in combined for kw in KID_KEYWORDS):
                            continue

                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue

                        loc = item.get("location", {})
                        venue = loc.get("name", "") if isinstance(loc, dict) else ""
                        offers = item.get("offers", {})
                        is_free = False
                        cost = ""
                        if isinstance(offers, dict):
                            p = str(offers.get("price", ""))
                            is_free = p in ("0", "0.00", "")
                            cost = "Free" if is_free else f"${p}+"

                        events.append(make_event(
                            title=name,
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=venue,
                            cost=cost,
                            is_free=is_free,
                            url=item.get("url", ""),
                            description=desc[:300],
                            source="eventbrite",
                            age_range=extract_age_range(combined),
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        time.sleep(2)

    logger.info(f"    Eventbrite kids: {len(events)} events")
    return events


# ── Source 4: Museum kids programming ──────────────────────

def scrape_museums_kids():
    logger.info("  Scraping museum kids programs...")
    events = []

    museums = [
        ("https://cmom.org/calendar/", "Children's Museum of Manhattan", "Upper West Side"),
        ("https://www.brooklynkids.org/calendar/", "Brooklyn Children's Museum", "Crown Heights"),
        ("https://nysci.org/events/", "NY Hall of Science", "Corona"),
        ("https://www.intrepidmuseum.org/events", "Intrepid Museum", "Hell's Kitchen"),
    ]

    for url, museum_name, hood in museums:
        soup = fetch(url)
        if not soup:
            soup = fetch_playwright(url, wait_selector="article, .event, h3, h2")
        if not soup:
            continue

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") in ("Event", "ChildrensEvent", "EducationEvent"):
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        events.append(make_event(
                            title=item.get("name", ""),
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=museum_name,
                            neighborhood=hood,
                            url=item.get("url", url),
                            description=item.get("description", ""),
                            source="museum",
                            age_range=extract_age_range(item.get("description", "")),
                            is_free="free" in json.dumps(item).lower(),
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        # HTML fallback
        for card in soup.select("article, .event-card, .event, [class*='event']"):
            title_el = card.select_one("h2, h3, h4, .title")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            text = card.get_text(" ", strip=True)
            dt = parse_date_safe(text)
            if not dt:
                continue

            link = card.find("a", href=True)
            ev_url = link["href"] if link else url
            if ev_url and not ev_url.startswith("http"):
                ev_url = url.split("/")[0] + "//" + url.split("/")[2] + ev_url

            events.append(make_event(
                title=title,
                date_str=dt.strftime("%Y-%m-%d"),
                venue=museum_name,
                neighborhood=hood,
                url=ev_url,
                description=text[:300],
                source="museum",
                age_range=extract_age_range(text) or "All ages",
                is_free="free" in text.lower(),
            ))

        time.sleep(2)

    logger.info(f"    Museums kids: {len(events)} events")
    return events


# ── Source 5: Parks programming ────────────────────────────

def scrape_parks_programming():
    logger.info("  Scraping parks programming...")
    events = []

    parks = [
        ("https://www.centralparknyc.org/activities", "Central Park", "Central Park"),
        ("https://bryantpark.org/", "Bryant Park", "Midtown"),
    ]

    for url, park_name, hood in parks:
        soup = fetch(url)
        if not soup:
            continue

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") == "Event":
                        text = json.dumps(item).lower()
                        if not any(kw in text for kw in KID_KEYWORDS):
                            continue
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        events.append(make_event(
                            title=item.get("name", ""),
                            date_str=dt.strftime("%Y-%m-%d"),
                            venue=park_name,
                            neighborhood=hood,
                            url=item.get("url", url),
                            description=item.get("description", ""),
                            source="parks",
                            is_free=True,
                            cost="Free",
                            age_range=extract_age_range(item.get("description", "")) or "All ages",
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        time.sleep(2)

    logger.info(f"    Parks: {len(events)} events")
    return events


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

            # Check dupe
            tmin = dt.strftime("%Y-%m-%dT00:00:00-04:00")
            tmax = dt.strftime("%Y-%m-%dT23:59:59-04:00")
            existing = service.events().list(
                calendarId=KID_CAL_ID, timeMin=tmin, timeMax=tmax,
                q=ev["title"][:50], singleEvents=True, maxResults=3,
            ).execute()
            if any(e.get("summary", "").lower().strip() == ev["title"].lower().strip()
                   for e in existing.get("items", [])):
                skipped += 1
                continue

            age_line = f"\nAges: {ev['age_range']}" if ev.get("age_range") else ""
            body = {
                "summary": ev["title"],
                "start": {"dateTime": dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "end": {"dateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "location": f"{ev['venue']}, {ev['neighborhood']}" if ev.get("neighborhood") else ev["venue"],
                "description": f"Category: Kid-Friendly\nVenue: {ev['venue']}{age_line}\nFree: {'Yes' if ev['is_free'] else 'No'}\n\n{ev.get('description','')}\n\nInfo: {ev.get('url','')}",
                "colorId": "7",
            }
            service.events().insert(calendarId=KID_CAL_ID, body=body).execute()
            created += 1
            time.sleep(0.3)
        except Exception as e:
            errors += 1
            if errors <= 3:
                logger.warning(f"  GCal error: {e}")

    logger.info(f"  GCal: {created} created, {skipped} skipped, {errors} errors")
    return {"created": created, "skipped": skipped, "errors": errors}


# ── Supabase Push ──────────────────────────────────────────

def push_to_supabase(events):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    manual = supabase.table("events").select("title,date").eq("source", "manual_curated").eq("category", "Kid-Friendly").execute()
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
                "category": "Kid-Friendly",
                "cost": ev.get("cost"),
                "is_free": ev.get("is_free", False),
                "url": ev.get("url"),
                "description": ev.get("description"),
                "source": f"kid_friendly_{ev['source']}",
                "age_range": ev.get("age_range"),
                "is_featured": ev.get("is_featured", False),
            }, on_conflict="title,date,venue").execute()
            created += 1
        except Exception as e:
            errors += 1
            if errors <= 3:
                logger.warning(f"  Supabase error: {e}")

    logger.info(f"  Supabase: {created} upserted, {skipped} skipped, {errors} errors")
    return {"upserted": created, "skipped": skipped, "errors": errors}


# ── Main ───────────────────────────────────────────────────

def scrape_all_kid_events():
    logger.info("=== KID-FRIENDLY EVENTS SCRAPER ===")

    all_events = []
    source_counts = {}

    scrapers = [
        ("mommypoppins", scrape_mommypoppins),
        ("nycparks", scrape_nycparks_kids),
        ("eventbrite", scrape_eventbrite_kids),
        ("museums", scrape_museums_kids),
        ("parks", scrape_parks_programming),
    ]

    for name, fn in scrapers:
        try:
            evts = fn()
            source_counts[name] = len(evts)
            all_events.extend(evts)
        except Exception as e:
            logger.error(f"  {name} failed: {e}")
            source_counts[name] = f"ERROR: {e}"

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

    logger.info(f"=== KID-FRIENDLY SCRAPER COMPLETE ===")
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_kid_events()
