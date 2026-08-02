"""Scrape live music / concerts for NYC and push to Supabase.

Adds depth on top of the existing Songkick concerts scraper:
  1. Bandsintown NYC  — thousands of shows; blocks plain requests (403) but a
     real browser renders schema.org MusicEvent JSON-LD we can read reliably.
  2. Curated jazz + indie venues — high-value niche the aggregators thin out
     (Blue Note, Village Vanguard, Birdland). JS-rendered, so Playwright too.

Category: "Concert". Supabase-only (the site reads from Supabase); the concerts
Google Calendar is fed separately by run_external_scrapers.
"""

import json
import logging
import os
import re
import sys
import time
from datetime import date, timedelta

from dateutil import parser as dateparser
from thefuzz import fuzz

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

TODAY = date.today()
MAX_DATE = TODAY + timedelta(days=120)

# Venue-name fragments → borough (Bandsintown gives us the venue, not the borough)
BROOKLYN_VENUES = ("brooklyn", "elsewhere", "warsaw", "kings theatre", "williamsburg",
                   "music hall of williamsburg", "baby's all right", "saint vitus",
                   "sultan room", "market hotel", "brooklyn bowl", "brooklyn steel",
                   "public records", "good room", "bell house", "littlefield", "prospect")
QUEENS_VENUES = ("queens", "knockdown", "forest hills", "flushing", "astoria", "trans-pecos")
BRONX_VENUES = ("bronx", "yankee")


def classify_borough(venue, neighborhood=""):
    text = f"{venue or ''} {neighborhood or ''}".lower()
    if any(w in text for w in BROOKLYN_VENUES):
        return "Brooklyn"
    if any(w in text for w in QUEENS_VENUES):
        return "Queens"
    if any(w in text for w in BRONX_VENUES):
        return "Bronx"
    return "Manhattan"


def parse_date_safe(text):
    if not text:
        return None
    try:
        dt = dateparser.parse(text, fuzzy=True)
        if dt and TODAY <= dt.date() <= MAX_DATE:
            return dt
    except (ValueError, OverflowError, TypeError):
        pass
    return None


def make_event(title, dt, venue="", neighborhood="", url="", description="",
               is_free=False, cost="", source="", borough=None):
    return {
        "title": title.strip()[:200],
        "date": dt.strftime("%Y-%m-%d"),
        "time": dt.strftime("%I:%M %p").lstrip("0") if (dt.hour or dt.minute) else None,
        "end_time": None,
        "venue": (venue or "").strip()[:200] or None,
        "neighborhood": (neighborhood or "").strip() or None,
        "borough": borough or classify_borough(venue, neighborhood),
        "category": "Concert",
        "cost": cost or None,
        "is_free": is_free,
        "url": (url or "").strip()[:500] or None,
        "description": (description or "").strip()[:500] or None,
        "source": source,
        "event_type": "concert",
        "is_featured": False,
    }


def _render(url, scrolls=0, wait_ms=3500, timeout_ms=30000):
    """Load a page in a real browser and return fully-rendered HTML (or None)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("Playwright not installed")
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                user_agent=USER_AGENT,
                viewport={"width": 1280, "height": 900},
            )
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            page.wait_for_timeout(wait_ms)
            for _ in range(scrolls):
                page.mouse.wheel(0, 6000)
                page.wait_for_timeout(1800)
            html = page.content()
            browser.close()
            return html
    except Exception as e:
        logger.warning(f"  Render failed for {url}: {e}")
        return None


def _collect_event_links(url, scrolls, timeout_ms=30000):
    """Render a page and return [(href, text)] for every event card link.

    Used for Bandsintown, whose city page only emits JSON-LD for today but
    renders the full future list as `/e/{id}` card links after scrolling.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("Playwright not installed")
        return []
    out = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=USER_AGENT, viewport={"width": 1280, "height": 900})
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            page.wait_for_timeout(3500)
            for _ in range(scrolls):
                page.mouse.wheel(0, 6000)
                page.wait_for_timeout(1600)
            for a in page.query_selector_all("a[href*='/e/']"):
                href = a.get_attribute("href") or ""
                text = (a.inner_text() or "").strip()
                if href and text:
                    out.append((href, text))
            browser.close()
    except Exception as e:
        logger.warning(f"  Card collection failed for {url}: {e}")
    return out


def _extract_jsonld_events(html):
    """Pull every schema.org Event/MusicEvent object out of rendered HTML."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    out = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop()
            if isinstance(item, list):
                stack.extend(item)
                continue
            if not isinstance(item, dict):
                continue
            # Unwrap ItemList / @graph containers
            if "@graph" in item:
                stack.extend(item["@graph"] if isinstance(item["@graph"], list) else [item["@graph"]])
            if item.get("@type") == "ItemList":
                for el in item.get("itemListElement", []):
                    stack.append(el.get("item", el) if isinstance(el, dict) else el)
                continue
            if "Event" in str(item.get("@type", "")):
                out.append(item)
    return out


def _event_from_jsonld(item, default_venue="", source="", neighborhood=""):
    dt = parse_date_safe(item.get("startDate", ""))
    if not dt:
        return None
    name = (item.get("name") or "").strip()
    if not name or len(name) < 2 or len(name) > 200:
        return None

    loc = item.get("location", {})
    venue = default_venue
    if isinstance(loc, dict) and loc.get("name"):
        venue = loc["name"]
    elif isinstance(loc, list) and loc and isinstance(loc[0], dict):
        venue = loc[0].get("name", default_venue)

    # Price / free
    is_free, cost = False, ""
    offers = item.get("offers")
    offer = offers[0] if isinstance(offers, list) and offers else offers
    if isinstance(offer, dict):
        price = str(offer.get("price", "") or offer.get("lowPrice", ""))
        if price in ("0", "0.0", "0.00"):
            is_free = True
        elif price and price.replace(".", "").isdigit():
            cost = f"${int(float(price))}"

    return make_event(
        title=name,
        dt=dt,
        venue=venue,
        neighborhood=neighborhood,
        url=item.get("url", ""),
        description=item.get("description", ""),
        is_free=is_free,
        cost=cost,
        source=source,
    )


# ── Source 1: Bandsintown NYC ──────────────────────────────

BANDSINTOWN_URL = "https://www.bandsintown.com/c/new-york-ny"

# A card renders as three lines: artist / "Sun, Oct 25 · 7 PM" / venue
_DATE_LINE_RE = re.compile(
    r"^([A-Z][a-z]{2},\s*[A-Z][a-z]{2}\s*\d{1,2})"
    r"(?:\s*[^\dA-Za-z]+\s*(\d{1,2}(?::\d{2})?\s*[AP]M))?\s*$"
)


def scrape_bandsintown():
    """Parse Bandsintown NYC event cards (full future range, not just today).

    inner_text is newline-separated: artist, then "Day, Mon DD · Time", then venue.
    """
    logger.info("  Scraping Bandsintown NYC...")
    links = _collect_event_links(BANDSINTOWN_URL, scrolls=10)
    events, seen_urls = [], set()

    for href, text in links:
        clean_url = href.split("?")[0]
        if clean_url in seen_urls:
            continue
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        if len(lines) < 2:
            continue

        # Find the line that holds the date
        date_idx = next((i for i, ln in enumerate(lines) if _DATE_LINE_RE.match(ln)), None)
        if date_idx is None or date_idx == 0:
            continue
        dm = _DATE_LINE_RE.match(lines[date_idx])
        date_part, time_part = dm.group(1), (dm.group(2) or "")
        dt = parse_date_safe(f"{date_part} {time_part}".strip())
        if not dt:
            continue

        artist = " ".join(lines[:date_idx]).strip()
        venue = lines[date_idx + 1].strip() if date_idx + 1 < len(lines) else ""
        if not artist or len(artist) > 150:
            continue

        seen_urls.add(clean_url)
        events.append(make_event(
            title=f"{artist} at {venue}" if venue else artist,
            dt=dt,
            venue=venue,
            url=href,
            source="music_bandsintown",
        ))

    logger.info(f"    Bandsintown: {len(events)} events from {len(links)} card links")
    return events


# ── Source 2: Curated jazz + indie venues ──────────────────

# Curated jazz/indie venues. Disabled by default: as of 2026-08 none of these
# expose schema.org JSON-LD even after a full browser render (they hydrate their
# calendars from internal APIs), so scrape_venue returns 0 and only adds ~40s per
# run. The JSON-LD path below is kept ready — re-populate this list the moment a
# venue ships parseable JSON-LD, or add per-venue API handling.
MUSIC_VENUES: list[dict] = []


def scrape_venue(v):
    html = _render(v["url"], scrolls=2)
    if not html:
        return []
    events = []
    for item in _extract_jsonld_events(html):
        ev = _event_from_jsonld(
            item, default_venue=v["name"], neighborhood=v["hood"],
            source=f"music_{re.sub(r'[^a-z]+', '_', v['name'].lower()).strip('_')}",
        )
        if ev:
            ev["venue"] = ev["venue"] or v["name"]
            events.append(ev)
    return events


# ── Dedup + push ───────────────────────────────────────────

def deduplicate(events):
    unique = []
    for ev in events:
        dup = False
        for u in unique:
            if ev["date"] != u["date"]:
                continue
            same_venue = (ev.get("venue") or "").lower() == (u.get("venue") or "").lower()
            if fuzz.token_sort_ratio(ev["title"].lower(), u["title"].lower()) >= 85 and same_venue:
                dup = True
                break
        if not dup:
            unique.append(ev)
    removed = len(events) - len(unique)
    if removed:
        logger.info(f"  Dedup: removed {removed} duplicates")
    return unique


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
                "venue": ev["venue"],
                "neighborhood": ev.get("neighborhood"),
                "borough": ev.get("borough", "Manhattan"),
                "category": "Concert",
                "cost": ev.get("cost"),
                "is_free": ev.get("is_free", False),
                "url": ev.get("url"),
                "description": ev.get("description"),
                "source": ev["source"],
                "event_type": "concert",
            }, on_conflict="title,date,venue").execute()
            created += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                logger.warning(f"  Supabase error: {e}")
    logger.info(f"  Supabase: {created} upserted, {errors} errors")
    return {"upserted": created, "errors": errors}


def scrape_all_music_events():
    logger.info("=== MUSIC EVENTS SCRAPER ===")
    all_events = []
    source_counts = {}

    try:
        bit = scrape_bandsintown()
        source_counts["bandsintown"] = len(bit)
        all_events.extend(bit)
    except Exception as e:
        logger.error(f"  Bandsintown failed: {e}")
        source_counts["bandsintown"] = f"ERROR: {e}"

    for v in MUSIC_VENUES:
        try:
            logger.info(f"  Scraping {v['name']}...")
            evts = scrape_venue(v)
            source_counts[v["name"]] = len(evts)
            all_events.extend(evts)
        except Exception as e:
            logger.error(f"  {v['name']} failed: {e}")
            source_counts[v["name"]] = f"ERROR: {e}"
        time.sleep(1)

    logger.info(f"  Total scraped: {len(all_events)}")
    for src, count in source_counts.items():
        logger.info(f"    {src}: {count}")

    unique = deduplicate(all_events)
    logger.info(f"  After dedup: {len(unique)}")

    supa = push_to_supabase(unique)
    results = {
        "scraped": len(all_events),
        "unique": len(unique),
        "sources": source_counts,
        "supabase": supa,
    }
    logger.info("=== MUSIC SCRAPER COMPLETE ===")
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_music_events()
