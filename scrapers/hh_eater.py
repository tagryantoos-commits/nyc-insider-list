"""Scrape Eater NY happy hour guides to enrich the database."""

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
    "https://ny.eater.com/maps/best-happy-hours-nyc",
    "https://ny.eater.com/maps/best-happy-hour-food-deals-nyc",
    "https://ny.eater.com/maps/best-new-happy-hours-nyc",
]


def fetch(url):
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        logger.warning(f"Fetch failed: {url}: {e}")
        return None


def extract_venues(soup):
    venues = []
    if not soup:
        return venues

    # Eater uses map/list articles with venue cards
    for card in soup.select("section, article, .c-mapstack__card, [data-venue]"):
        heading = card.select_one("h1, h2, h3")
        if not heading:
            continue
        name = heading.get_text(strip=True)
        if not name or len(name) < 3 or len(name) > 100:
            continue
        if name.lower().startswith(("the best", "where to", "map:", "read", "also")):
            continue

        # Address
        addr_el = card.select_one("address, .c-mapstack__address, [class*='address']")
        address = addr_el.get_text(strip=True) if addr_el else ""

        # Description text
        text = ""
        for p in card.find_all("p"):
            text += " " + p.get_text(strip=True)

        # Extract specials
        drink_specials = []
        food_specials = []
        for sentence in re.split(r'[.;]', text):
            s = sentence.strip().lower()
            if any(w in s for w in ("$", "half", "discount", "deal", "special")):
                if any(w in s for w in ("beer", "wine", "cocktail", "drink", "well", "draft")):
                    drink_specials.append(sentence.strip())
                if any(w in s for w in ("oyster", "taco", "wing", "appetizer", "pizza", "food")):
                    food_specials.append(sentence.strip())

        # Extract times
        time_match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)', text)
        start_time = time_match.group(1) if time_match else ""
        end_time = time_match.group(2) if time_match else ""

        venues.append({
            "name": name,
            "address": address,
            "drink_specials": "; ".join(drink_specials)[:500],
            "food_specials": "; ".join(food_specials)[:500],
            "start_time": start_time,
            "end_time": end_time,
        })

    return venues


def match_and_update(venues, supabase):
    result = supabase.table("happy_hours").select("id,name,address").execute()
    existing = result.data or []
    matched = 0
    inserted = 0

    for venue in venues:
        best_match = None
        best_score = 0

        for db_entry in existing:
            score = fuzz.token_sort_ratio(venue["name"].lower(), db_entry["name"].lower())
            if venue["address"] and db_entry.get("address"):
                addr_score = fuzz.token_sort_ratio(venue["address"].lower(), db_entry["address"].lower())
                if addr_score > 70:
                    score += 10
            if score > best_score and score >= 80:
                best_score = score
                best_match = db_entry

        update_data = {}
        if venue["drink_specials"]:
            update_data["drink_specials"] = venue["drink_specials"]
        if venue["food_specials"]:
            update_data["food_specials"] = venue["food_specials"]
            update_data["has_food_specials"] = True
        if venue["start_time"]:
            update_data["start_time"] = venue["start_time"]
        if venue["end_time"]:
            update_data["end_time"] = venue["end_time"]

        if not update_data:
            continue

        if best_match:
            supabase.table("happy_hours").update(update_data).eq("id", best_match["id"]).execute()
            matched += 1
        else:
            insert_data = {"name": venue["name"], "address": venue["address"] or None, "source": "eater", **update_data}
            try:
                supabase.table("happy_hours").insert(insert_data).execute()
                inserted += 1
            except Exception:
                pass

    return matched, inserted


def scrape():
    logger.info("Scraping Eater NY...")
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
    logger.info(f"  Eater: {matched} matched, {inserted} new, {len(all_venues)} total")
    return all_venues


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    scrape()
