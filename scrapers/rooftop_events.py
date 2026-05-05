"""Scrape rooftop events from multiple NYC sources.

Returns normalized event dicts. Pushes to Google Calendar + Supabase.
"""

import json
import logging
import os
import re
import sys
import time
from datetime import datetime, date, timedelta

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser
from thefuzz import fuzz

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

GCAL_TOKEN = os.path.join(os.path.dirname(__file__), "..", "..", "nyc-events-calendar", "token.json")
GCAL_CREDS = os.path.join(os.path.dirname(__file__), "..", "..", "nyc-events-calendar", "credentials.json")
ROOFTOP_CAL_ID = "c_0477e3b61407f64d8b528649f3ace1be4db3fef1e0d125a3fd49f67976dba923@group.calendar.google.com"

TODAY = date.today()
MAX_DATE = TODAY + timedelta(days=90)


def fetch(url):
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
        if resp.status_code == 200:
            return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        logger.warning(f"Fetch failed: {url}: {e}")
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
               description="", source="", is_featured=False):
    return {
        "title": title.strip(),
        "date": date_str,
        "time": time_str,
        "end_time": end_time,
        "venue": venue,
        "neighborhood": neighborhood,
        "category": "Rooftop",
        "cost": cost,
        "is_free": is_free,
        "url": url,
        "description": description[:500] if description else "",
        "source": source,
        "is_featured": is_featured,
    }


# ── Source 1: Pier 17 ──────────────────────────────────────

def scrape_pier17():
    logger.info("  Scraping Pier 17...")
    events = []
    for url in ["https://rooftopatpier17.com/line-up/", "https://rooftopatpier17.com/concerts/"]:
        soup = fetch(url)
        if not soup:
            continue

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") in ("Event", "MusicEvent"):
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        name = item.get("name", "")
                        ev_url = item.get("url", url)
                        desc = item.get("description", "")
                        sold = "sold out" in (name + desc).lower()
                        events.append(make_event(
                            title=name,
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue="The Rooftop at Pier 17",
                            neighborhood="Lower Manhattan",
                            cost="Sold Out" if sold else "",
                            url=ev_url,
                            description=desc,
                            source="pier17",
                            is_featured=True,
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        # HTML fallback
        if not events:
            for card in soup.select("article, .event-card, .event, .show-card, a[href*='/events/']"):
                title_el = card.select_one("h2, h3, h4, .title")
                if not title_el:
                    title_el = card
                title = title_el.get_text(strip=True)
                if not title or len(title) < 3:
                    continue

                link = card.find("a", href=True)
                ev_url = ""
                if link:
                    href = link["href"]
                    ev_url = href if href.startswith("http") else f"https://rooftopatpier17.com{href}"

                text = card.get_text(" ", strip=True)
                dt = parse_date_safe(text)
                if not dt:
                    continue

                sold = "sold out" in text.lower()
                events.append(make_event(
                    title=title,
                    date_str=dt.strftime("%Y-%m-%d"),
                    venue="The Rooftop at Pier 17",
                    neighborhood="Lower Manhattan",
                    cost="Sold Out" if sold else "",
                    url=ev_url,
                    source="pier17",
                    is_featured=True,
                ))

        time.sleep(2)

    logger.info(f"    Pier 17: {len(events)} events")
    return events


# ── Source 2: Marquee Skydeck at Edge ──────────────────────

def scrape_edge():
    logger.info("  Scraping Edge/Marquee...")
    events = []
    soup = fetch("https://www.edgenyc.com/marquee-skydeck/")
    if not soup:
        return events

    # JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") in ("Event", "MusicEvent", "DanceEvent"):
                    dt = parse_date_safe(item.get("startDate", ""))
                    if not dt:
                        continue
                    events.append(make_event(
                        title=item.get("name", ""),
                        date_str=dt.strftime("%Y-%m-%d"),
                        time_str="11:00 PM",
                        end_time="3:00 AM",
                        venue="Marquee Skydeck at Edge",
                        neighborhood="Hudson Yards",
                        cost=item.get("offers", {}).get("price", "$65+") if isinstance(item.get("offers"), dict) else "$65+",
                        url=item.get("url", "https://www.edgenyc.com/marquee-skydeck/"),
                        description=f"{item.get('description', '')} 21+.",
                        source="edge",
                    ))
        except (json.JSONDecodeError, TypeError):
            continue

    # HTML fallback
    if not events:
        for card in soup.select("article, .event, [class*='event'], [class*='lineup']"):
            text = card.get_text(" ", strip=True)
            dt = parse_date_safe(text)
            if not dt:
                continue
            title_el = card.select_one("h2, h3, h4, strong")
            title = title_el.get_text(strip=True) if title_el else text[:60]
            if len(title) < 3:
                continue
            events.append(make_event(
                title=title,
                date_str=dt.strftime("%Y-%m-%d"),
                time_str="11:00 PM",
                end_time="3:00 AM",
                venue="Marquee Skydeck at Edge",
                neighborhood="Hudson Yards",
                cost="$65+",
                url="https://www.edgenyc.com/marquee-skydeck/",
                description="21+.",
                source="edge",
            ))

    logger.info(f"    Edge: {len(events)} events")
    return events


# ── Source 3: 230 Fifth ────────────────────────────────────

def scrape_230fifth():
    logger.info("  Scraping 230 Fifth...")
    events = []
    for url in ["https://230-fifth.com/", "https://230-fifth.com/events/"]:
        soup = fetch(url)
        if not soup:
            continue

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") == "Event":
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        events.append(make_event(
                            title=item.get("name", ""),
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue="230 Fifth Rooftop",
                            neighborhood="Flatiron",
                            url=item.get("url", "https://230-fifth.com/"),
                            description=item.get("description", ""),
                            source="230fifth",
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        if not events:
            for card in soup.select("article, .event, [class*='event']"):
                title_el = card.select_one("h2, h3, h4")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                text = card.get_text(" ", strip=True)
                dt = parse_date_safe(text)
                if not dt:
                    continue
                events.append(make_event(
                    title=title,
                    date_str=dt.strftime("%Y-%m-%d"),
                    venue="230 Fifth Rooftop",
                    neighborhood="Flatiron",
                    url="https://230-fifth.com/",
                    description=text[:200],
                    source="230fifth",
                ))

        time.sleep(2)

    logger.info(f"    230 Fifth: {len(events)} events")
    return events


# ── Source 4: Eventbrite ───────────────────────────────────

def scrape_eventbrite():
    logger.info("  Scraping Eventbrite rooftop events...")
    events = []

    for query in ["rooftop-party", "rooftop-event"]:
        url = f"https://www.eventbrite.com/d/ny--new-york/{query}/"
        soup = fetch(url)
        if not soup:
            continue

        # JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    for elem in data.get("itemListElement", []):
                        item = elem.get("item", elem)
                        if item.get("@type") != "Event":
                            continue
                        name = item.get("name", "")
                        if "rooftop" not in name.lower() and "rooftop" not in json.dumps(item.get("location", {})).lower():
                            continue
                        dt = parse_date_safe(item.get("startDate", ""))
                        if not dt:
                            continue
                        loc = item.get("location", {})
                        venue = loc.get("name", "") if isinstance(loc, dict) else ""
                        offers = item.get("offers", {})
                        price = ""
                        is_free = False
                        if isinstance(offers, dict):
                            p = str(offers.get("price", ""))
                            is_free = p in ("0", "0.00", "")
                            price = "Free" if is_free else f"${p}+"
                        events.append(make_event(
                            title=name,
                            date_str=dt.strftime("%Y-%m-%d"),
                            time_str=dt.strftime("%I:%M %p").lstrip("0") if dt.hour else None,
                            venue=venue,
                            cost=price,
                            is_free=is_free,
                            url=item.get("url", ""),
                            description=item.get("description", "")[:300],
                            source="eventbrite",
                        ))
            except (json.JSONDecodeError, TypeError):
                continue

        time.sleep(2)

    logger.info(f"    Eventbrite: {len(events)} events")
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
        logger.error(f"  Google Calendar auth failed: {e}")
        return {"created": 0, "skipped": 0, "errors": 0}

    created = 0
    skipped = 0
    errors = 0

    for ev in events:
        try:
            # Build datetime
            dt_str = ev["date"]
            if ev.get("time"):
                dt = dateparser.parse(f"{ev['date']} {ev['time']}")
            else:
                dt = dateparser.parse(ev["date"])

            if ev.get("end_time"):
                end_dt = dateparser.parse(f"{ev['date']} {ev['end_time']}")
                if end_dt and dt and end_dt <= dt:
                    end_dt += timedelta(days=1)
            else:
                end_dt = dt + timedelta(hours=2) if dt else None

            if not dt:
                skipped += 1
                continue

            # Check if exists
            time_min = dt.strftime("%Y-%m-%dT00:00:00-04:00")
            time_max = dt.strftime("%Y-%m-%dT23:59:59-04:00")
            existing = service.events().list(
                calendarId=ROOFTOP_CAL_ID,
                timeMin=time_min, timeMax=time_max,
                q=ev["title"][:50], singleEvents=True, maxResults=3,
            ).execute()

            found = any(
                e.get("summary", "").lower().strip() == ev["title"].lower().strip()
                for e in existing.get("items", [])
            )
            if found:
                skipped += 1
                continue

            # Insert
            body = {
                "summary": ev["title"],
                "start": {"dateTime": dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "end": {"dateTime": end_dt.strftime("%Y-%m-%dT%H:%M:%S"), "timeZone": "America/New_York"},
                "location": f"{ev['venue']}, {ev['neighborhood']}" if ev.get("neighborhood") else ev["venue"],
                "description": f"Category: Rooftop\nVenue: {ev['venue']}\n{ev.get('description','')}\n\nTickets/Info: {ev.get('url','')}",
                "colorId": "9",
            }
            service.events().insert(calendarId=ROOFTOP_CAL_ID, body=body).execute()
            created += 1
            time.sleep(0.3)

        except Exception as e:
            errors += 1
            if errors <= 3:
                logger.warning(f"  GCal error for '{ev['title'][:30]}': {e}")

    logger.info(f"  GCal: {created} created, {skipped} skipped, {errors} errors")
    return {"created": created, "skipped": skipped, "errors": errors}


# ── Supabase Push ──────────────────────────────────────────

def push_to_supabase(events):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get existing manual_curated events to avoid overwriting
    manual = supabase.table("events").select("title,date").eq("source", "manual_curated").eq("category", "Rooftop").execute()
    manual_keys = {(r["title"].lower().strip(), r["date"]) for r in (manual.data or [])}

    created = 0
    skipped_manual = 0
    errors = 0

    for ev in events:
        key = (ev["title"].lower().strip(), ev["date"])
        if key in manual_keys:
            skipped_manual += 1
            continue

        try:
            supabase.table("events").upsert({
                "title": ev["title"],
                "date": ev["date"],
                "time": ev.get("time"),
                "end_time": ev.get("end_time"),
                "venue": ev["venue"],
                "neighborhood": ev.get("neighborhood"),
                "category": "Rooftop",
                "cost": ev.get("cost"),
                "is_free": ev.get("is_free", False),
                "url": ev.get("url"),
                "description": ev.get("description"),
                "source": f"rooftop_scraper_{ev['source']}",
                "is_featured": ev.get("is_featured", False),
            }, on_conflict="title,date,venue").execute()
            created += 1
        except Exception as e:
            errors += 1
            if errors <= 3:
                logger.warning(f"  Supabase error for '{ev['title'][:30]}': {e}")

    logger.info(f"  Supabase: {created} upserted, {skipped_manual} skipped (manual), {errors} errors")
    return {"upserted": created, "skipped_manual": skipped_manual, "errors": errors}


# ── Cleanup ────────────────────────────────────────────────

def cleanup_past_events():
    logger.info("  Cleaning up past events...")
    cutoff = (TODAY - timedelta(days=7)).strftime("%Y-%m-%d")

    # Supabase: delete old rooftop scraper events (not manual_curated)
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    result = supabase.table("events").delete().lt(
        "date", cutoff
    ).eq("category", "Rooftop").like("source", "rooftop_scraper_%").execute()
    deactivated = len(result.data) if result.data else 0

    # Google Calendar: delete old events
    gcal_deleted = 0
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials.from_authorized_user_file(GCAL_TOKEN)
        if not creds.valid and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        service = build("calendar", "v3", credentials=creds)

        cutoff_dt = f"{cutoff}T00:00:00-04:00"
        old_events = service.events().list(
            calendarId=ROOFTOP_CAL_ID,
            timeMax=cutoff_dt,
            singleEvents=True, maxResults=100,
        ).execute()

        for item in old_events.get("items", []):
            try:
                service.events().delete(calendarId=ROOFTOP_CAL_ID, eventId=item["id"]).execute()
                gcal_deleted += 1
                time.sleep(0.3)
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"  GCal cleanup error: {e}")

    logger.info(f"  Cleanup: {deactivated} deactivated in Supabase, {gcal_deleted} deleted from GCal")
    return {"deactivated": deactivated, "gcal_deleted": gcal_deleted}


# ── Main ───────────────────────────────────────────────────

def scrape_all_rooftop_events():
    """Run all scrapers, dedup, push to GCal + Supabase, cleanup."""
    logger.info("=== ROOFTOP EVENTS SCRAPER ===")

    all_events = []
    source_counts = {}

    scrapers = [
        ("pier17", scrape_pier17),
        ("edge", scrape_edge),
        ("230fifth", scrape_230fifth),
        ("eventbrite", scrape_eventbrite),
    ]

    for name, scraper_fn in scrapers:
        try:
            events = scraper_fn()
            source_counts[name] = len(events)
            all_events.extend(events)
        except Exception as e:
            logger.error(f"  {name} scraper failed: {e}")
            source_counts[name] = f"ERROR: {e}"

    logger.info(f"  Total scraped: {len(all_events)}")
    for src, count in source_counts.items():
        logger.info(f"    {src}: {count}")

    # Dedup
    unique = deduplicate(all_events)
    logger.info(f"  After dedup: {len(unique)}")

    # Push
    gcal_results = push_to_gcal(unique)
    supabase_results = push_to_supabase(unique)

    # Cleanup
    cleanup_results = cleanup_past_events()

    results = {
        "scraped": len(all_events),
        "unique": len(unique),
        "sources": source_counts,
        "gcal": gcal_results,
        "supabase": supabase_results,
        "cleanup": cleanup_results,
    }

    logger.info(f"=== ROOFTOP SCRAPER COMPLETE ===")
    logger.info(f"  Results: {json.dumps(results, default=str)}")
    return results


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    scrape_all_rooftop_events()
