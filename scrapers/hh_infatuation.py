"""Scrape TheInfatuation.com happy hour guides to enrich the database."""

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
    "https://www.theinfatuation.com/new-york/guides/best-happy-hours-nyc",
    "https://www.theinfatuation.com/new-york/guides/best-happy-hour-food-nyc",
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
    """Extract venue names, neighborhoods, and specials text from Infatuation articles."""
    venues = []
    if not soup:
        return venues

    # Infatuation uses h2 or h3 for venue names in list articles
    for heading in soup.find_all(["h2", "h3"]):
        name = heading.get_text(strip=True)
        if not name or len(name) < 3 or len(name) > 100:
            continue
        # Skip section headers like "The Best..." or "Where to..."
        if name.lower().startswith(("the best", "where to", "how to", "what to", "why")):
            continue

        # Get the paragraph(s) after the heading for specials info
        specials_text = ""
        neighborhood = ""
        sibling = heading.find_next_sibling()
        while sibling and sibling.name not in ("h2", "h3"):
            text = sibling.get_text(strip=True)
            if text:
                specials_text += " " + text
                # Look for neighborhood mentions
                for hood in ["East Village", "West Village", "LES", "Lower East Side",
                             "SoHo", "Tribeca", "Chelsea", "Williamsburg", "Bushwick",
                             "Greenpoint", "Park Slope", "Astoria", "Midtown",
                             "Hell's Kitchen", "Murray Hill", "Gramercy", "Flatiron",
                             "NoHo", "Nolita", "DUMBO", "Fort Greene"]:
                    if hood.lower() in text.lower():
                        neighborhood = hood
                        break
            sibling = sibling.find_next_sibling()

        # Extract drink/food specials from text
        drink_specials = []
        food_specials = []
        for sentence in re.split(r'[.;]', specials_text):
            s = sentence.strip().lower()
            if any(w in s for w in ("$", "half", "discount", "deal", "special", "off")):
                if any(w in s for w in ("beer", "wine", "cocktail", "martini", "margarita",
                                        "drink", "shot", "well", "draft", "pour")):
                    drink_specials.append(sentence.strip())
                if any(w in s for w in ("oyster", "taco", "wing", "slider", "appetizer",
                                        "pizza", "burger", "fries", "nacho", "food")):
                    food_specials.append(sentence.strip())

        venues.append({
            "name": name,
            "neighborhood": neighborhood,
            "drink_specials": "; ".join(drink_specials)[:500] if drink_specials else "",
            "food_specials": "; ".join(food_specials)[:500] if food_specials else "",
            "raw_text": specials_text[:1000],
        })

    return venues


def match_and_update(venues, supabase):
    """Match scraped venues to existing DB entries and update specials."""
    # Get all existing happy hours
    result = supabase.table("happy_hours").select("id,name,address,neighborhood").execute()
    existing = result.data or []

    matched = 0
    inserted = 0

    for venue in venues:
        best_match = None
        best_score = 0

        for db_entry in existing:
            name_score = fuzz.token_sort_ratio(venue["name"].lower(), db_entry["name"].lower())
            # Boost if neighborhood matches
            if venue["neighborhood"] and db_entry.get("neighborhood"):
                if venue["neighborhood"].lower() == db_entry["neighborhood"].lower():
                    name_score += 10

            if name_score > best_score and name_score >= 80:
                best_score = name_score
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
            # Insert as new entry
            insert_data = {
                "name": venue["name"],
                "neighborhood": venue["neighborhood"] or None,
                "source": "infatuation",
                **update_data,
            }
            try:
                supabase.table("happy_hours").insert(insert_data).execute()
                inserted += 1
            except Exception:
                pass  # Likely duplicate

    return matched, inserted


def scrape():
    logger.info("Scraping TheInfatuation.com...")
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
    logger.info(f"  Infatuation: {matched} matched, {inserted} new, {len(all_venues)} total scraped")
    return all_venues


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    scrape()
