"""Scrape TimeOut NYC happy hour guides to enrich the database."""

import logging
import time
import re
import requests
from bs4 import BeautifulSoup
from thefuzz import fuzz
from supabase import create_client
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

URLS = [
    "https://www.timeout.com/newyork/bars/best-happy-hours-in-nyc",
    "https://www.timeout.com/newyork/restaurants/best-happy-hour-food-deals",
]


def fetch(url):
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
        if resp.status_code != 200:
            logger.warning(f"TimeOut returned {resp.status_code} for {url}")
            return None
        return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        logger.warning(f"Fetch failed: {url}: {e}")
        return None


def extract_venues(soup):
    venues = []
    if not soup:
        return venues

    for card in soup.select("article, .card, .listing-card, [data-testid*='card']"):
        heading = card.select_one("h2, h3, [data-testid*='title']")
        if not heading:
            continue
        name = heading.get_text(strip=True)
        if not name or len(name) < 3 or len(name) > 100:
            continue
        if name.lower().startswith(("the best", "where", "an expert", "photograph")):
            continue

        text = card.get_text(" ", strip=True)

        drink_specials = []
        food_specials = []
        for sentence in re.split(r'[.;]', text):
            s = sentence.strip().lower()
            if any(w in s for w in ("$", "half", "special", "deal")):
                if any(w in s for w in ("beer", "wine", "cocktail", "drink", "well")):
                    drink_specials.append(sentence.strip())
                if any(w in s for w in ("oyster", "taco", "wing", "appetizer", "food", "bite")):
                    food_specials.append(sentence.strip())

        venues.append({
            "name": name,
            "drink_specials": "; ".join(drink_specials)[:500],
            "food_specials": "; ".join(food_specials)[:500],
        })

    return venues


def match_and_update(venues, supabase):
    result = supabase.table("happy_hours").select("id,name").execute()
    existing = result.data or []
    matched = 0
    inserted = 0

    for venue in venues:
        best_match = None
        best_score = 0
        for db_entry in existing:
            score = fuzz.token_sort_ratio(venue["name"].lower(), db_entry["name"].lower())
            if score > best_score and score >= 80:
                best_score = score
                best_match = db_entry

        update_data = {}
        if venue["drink_specials"]:
            update_data["drink_specials"] = venue["drink_specials"]
        if venue["food_specials"]:
            update_data["food_specials"] = venue["food_specials"]
            update_data["has_food_specials"] = True
        if not update_data:
            continue

        if best_match:
            supabase.table("happy_hours").update(update_data).eq("id", best_match["id"]).execute()
            matched += 1
        else:
            try:
                supabase.table("happy_hours").insert({"name": venue["name"], "source": "timeout", **update_data}).execute()
                inserted += 1
            except Exception:
                pass

    return matched, inserted


def scrape():
    logger.info("Scraping TimeOut NYC...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    all_venues = []

    for url in URLS:
        logger.info(f"  Fetching: {url}")
        soup = fetch(url)
        venues = extract_venues(soup)
        logger.info(f"  Found {len(venues)} venues")
        all_venues.extend(venues)
        time.sleep(2)

    matched, inserted = match_and_update(all_venues, supabase)
    logger.info(f"  TimeOut: {matched} matched, {inserted} new, {len(all_venues)} total")
    return all_venues


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    scrape()
