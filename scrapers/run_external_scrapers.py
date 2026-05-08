"""Bridge: runs scrapers from ~/nyc-events-calendar and uploads to Supabase.

Covers sports (MLB API), concerts (Songkick), and festivals.
"""

import json
import logging
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

EXTERNAL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "nyc-events-calendar")


def classify_borough(venue, neighborhood=""):
    text = f"{venue or ''} {neighborhood or ''}".lower()
    if "brooklyn" in text or "barclays" in text:
        return "Brooklyn"
    if "queens" in text or "citi field" in text:
        return "Queens"
    if "bronx" in text or "yankee" in text:
        return "Bronx"
    return "Manhattan"


def run_scraper(scraper_name):
    """Run a scraper from the external project and upload results to Supabase."""
    logger.info(f"  Running external scraper: {scraper_name}...")

    # Import and run the scraper
    ext_scrapers = os.path.join(EXTERNAL_DIR, "scrapers")
    if ext_scrapers not in sys.path:
        sys.path.insert(0, ext_scrapers)
        sys.path.insert(0, EXTERNAL_DIR)

    try:
        # Import the scraper module
        if scraper_name == "sports":
            from sports import SportsScraper
            scraper = SportsScraper()
        elif scraper_name == "concerts":
            from concerts import ConcertsScraper
            scraper = ConcertsScraper()
        elif scraper_name == "festivals":
            from festivals import FestivalsScraper
            scraper = FestivalsScraper()
        else:
            logger.error(f"  Unknown scraper: {scraper_name}")
            return {"error": f"Unknown scraper: {scraper_name}"}

        events = scraper.run()
        logger.info(f"    Scraped {len(events)} events")
    except Exception as e:
        logger.error(f"    Scraper {scraper_name} failed: {e}")
        return {"error": str(e)}

    # Upload to Supabase
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    category_map = {"sports": "Sports", "concerts": "Concert", "festivals": "Festival"}
    category = category_map.get(scraper_name, "Other")

    created = errors = 0
    for ev in events:
        ds = ev.get("date_start", "")
        date_val = ds[:10] if ds else None
        if not date_val or not ev.get("title"):
            continue

        time_str = None
        if len(ds) > 10:
            try:
                dt = datetime.fromisoformat(ds.replace("Z", "+00:00"))
                time_str = dt.strftime("%I:%M %p").lstrip("0")
            except Exception:
                pass

        try:
            supabase.table("events").upsert({
                "title": ev["title"][:200],
                "date": date_val,
                "time": time_str,
                "venue": (ev.get("location") or "")[:200] or None,
                "category": category,
                "is_free": ev.get("is_free", False),
                "url": (ev.get("url") or "")[:500] or None,
                "description": (ev.get("description") or "")[:500] or None,
                "source": f"external_{scraper_name}",
                "borough": classify_borough(ev.get("location", ""), ev.get("neighborhood", "")),
            }, on_conflict="title,date,venue").execute()
            created += 1
        except Exception:
            errors += 1

    logger.info(f"    {scraper_name}: {created} upserted, {errors} errors")
    return {"scraped": len(events), "upserted": created, "errors": errors}


def run_all_external():
    """Run all external scrapers."""
    results = {}
    for name in ["sports", "concerts", "festivals"]:
        try:
            results[name] = run_scraper(name)
        except Exception as e:
            logger.error(f"  {name} failed: {e}")
            results[name] = {"error": str(e)}
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    run_all_external()
