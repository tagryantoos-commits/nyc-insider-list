"""Scrape Broadway shows from broadway.org and push to Supabase.

Broadway shows are ongoing (not single-date events). Each show gets
date = end of current month, refreshed weekly so they persist.
"""

import json
import logging
import os
import sys
import time
import re
import calendar
from datetime import date, timedelta

import requests as http_requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

TODAY = date.today()
# Set date to end of current month so shows persist until the next cron run
SHOW_DATE = date(TODAY.year, TODAY.month, calendar.monthrange(TODAY.year, TODAY.month)[1]).isoformat()


def scrape_broadway_org():
    """Scrape active shows from broadway.org/shows."""
    logger.info("  Scraping broadway.org...")
    shows = []

    resp = http_requests.get(
        "https://www.broadway.org/shows",
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    if resp.status_code != 200:
        logger.warning(f"  broadway.org returned {resp.status_code}")
        return shows

    soup = BeautifulSoup(resp.text, "lxml")

    # Find show links
    show_links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/shows/" in href and href != "/shows" and "?" not in href:
            full = href if href.startswith("http") else f"https://www.broadway.org{href}"
            show_links.add(full)

    logger.info(f"    Found {len(show_links)} show links")

    seen = set()
    for url in list(show_links)[:60]:
        time.sleep(1)
        try:
            r = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
            s = BeautifulSoup(r.text, "lxml")

            # Title
            title = ""
            h1 = s.find("h1")
            if h1:
                title = h1.get_text(strip=True)
            if not title:
                og = s.find("meta", property="og:title")
                if og:
                    title = og.get("content", "")
            # Clean title
            title = re.sub(r'\s*[-|].*Broadway\.org.*$', '', title, flags=re.IGNORECASE).strip()
            title = re.sub(r'\s*[-|]\s*On Broadway.*$', '', title, flags=re.IGNORECASE).strip()

            if not title or title in seen or len(title) < 2:
                continue
            seen.add(title)

            # Theater
            theater = ""
            for el in s.select("[class*='theatre'], [class*='theater'], [class*='venue']"):
                t = el.get_text(strip=True)
                if t and len(t) < 80:
                    theater = t
                    break

            # Description
            desc = ""
            og_desc = s.find("meta", property="og:description")
            if og_desc:
                desc = og_desc.get("content", "")[:400]

            shows.append({
                "title": title,
                "date": SHOW_DATE,
                "venue": theater or "Broadway Theater",
                "neighborhood": "Theater District",
                "borough": "Manhattan",
                "category": "Broadway",
                "url": url,
                "description": desc,
                "source": "broadway_weekly",
            })
        except Exception as e:
            pass

    logger.info(f"    Scraped {len(shows)} shows")
    return shows


def push_to_supabase(shows):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Delete old broadway_weekly events (they get recreated with new date)
    supabase.table("events").delete().eq("source", "broadway_weekly").execute()

    created = errors = 0
    for show in shows:
        try:
            supabase.table("events").upsert(show, on_conflict="title,date,venue").execute()
            created += 1
        except Exception:
            errors += 1

    logger.info(f"  Supabase: {created} upserted, {errors} errors")
    return {"upserted": created, "errors": errors}


def scrape_all_broadway():
    logger.info("=== BROADWAY SCRAPER ===")
    shows = scrape_broadway_org()
    result = push_to_supabase(shows)
    result["scraped"] = len(shows)
    logger.info(f"=== BROADWAY COMPLETE: {len(shows)} shows ===")
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_broadway()
