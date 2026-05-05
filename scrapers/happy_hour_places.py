"""Google Places API — seed the happy_hours table with bars/restaurants."""

import json
import os
import time
import logging
import requests
from supabase import create_client
from hh_config import (
    SUPABASE_URL, SUPABASE_KEY, GOOGLE_PLACES_API_KEY,
    NEIGHBORHOODS, SEARCH_QUERIES, CHAINS, USER_AGENT,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def is_chain(name: str) -> bool:
    n = name.lower().strip()
    return any(chain in n for chain in CHAINS)


def classify_vibe(name: str, types: list[str], price_level: int | None, rating: float | None) -> str:
    n = name.lower()
    types_set = set(t.lower() for t in types) if types else set()

    # 1. Name-based (strongest signal)
    if any(w in n for w in ("speakeasy", "hidden", "secret")):
        return "speakeasy"
    if any(w in n for w in ("rooftop", "sky", "terrace", "roof")):
        return "rooftop"
    if any(w in n for w in ("beer garden", "biergarten", "garden bar")):
        return "beer_garden"
    if any(w in n for w in ("wine bar", "wine room", "enoteca", "wine cellar")):
        return "wine_bar"
    if any(w in n for w in ("hotel", "inn ", "the mark", "the carlyle", "the plaza",
                             "st. regis", "ritz", "four seasons", "mandarin", "peninsula")):
        return "hotel_bar"
    if any(w in n for w in ("tiki", "tropical")):
        return "tiki_bar"
    if any(w in n for w in ("sports bar", "sports grill")):
        return "sports_bar"
    if any(w in n for w in ("pub ", " pub", "tavern", "alehouse", "ale house",
                             "taproom", "tap room", "irish", "mcsorley")):
        return "pub"
    if any(w in n for w in ("cocktail", "mixology", "apothecary", "pharmacy")):
        return "cocktail_lounge"
    if any(w in n for w in ("dive", "blarney")):
        return "dive_bar"
    if "lounge" in n:
        return "lounge"

    # 2. Google types
    if "night_club" in types_set and price_level and price_level >= 3:
        return "cocktail_lounge"
    if "night_club" in types_set:
        return "lounge"
    if "sports_bar" in types_set:
        return "sports_bar"
    if "restaurant" in types_set and "bar" in types_set:
        return "restaurant_bar"

    # 3. Price/rating heuristics
    if price_level == 1 and rating and rating < 4.0:
        return "dive_bar"
    if price_level == 1:
        return "pub"
    if price_level and price_level >= 3:
        return "cocktail_lounge"

    # 4. Defaults based on establishment type
    if "restaurant" in types_set:
        return "restaurant_bar"
    if "bar" in types_set:
        return "pub"
    return "pub"


def classify_borough(address: str) -> str:
    a = address.lower()
    if "brooklyn" in a:
        return "Brooklyn"
    if "queens" in a:
        return "Queens"
    if "bronx" in a:
        return "Bronx"
    if "staten island" in a:
        return "Staten Island"
    return "Manhattan"


def price_tier(level: int | None) -> str:
    if level is None:
        return "$$"
    if level <= 1:
        return "$"
    if level == 2:
        return "$$"
    return "$$$"


def search_places(query: str, api_key: str) -> list[dict]:
    """Use Places API v1 (New) Text Search."""
    results = []
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.location,places.types,places.priceLevel,"
            "places.rating,places.websiteUri,places.googleMapsUri,"
            "places.userRatingCount"
        ),
    }
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": 40.7580, "longitude": -73.9855},
                "radius": 25000.0,
            }
        },
        "maxResultCount": 20,
    }

    try:
        resp = requests.post(PLACES_TEXT_SEARCH_URL, headers=headers, json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        results.extend(data.get("places", []))
    except Exception as e:
        logger.warning(f"Places API error for '{query[:50]}': {e}")

    return results


def place_to_row(place: dict, neighborhood: str, borough: str) -> dict | None:
    name = place.get("displayName", {}).get("text", "")
    if not name:
        return None
    if is_chain(name):
        return None

    types = place.get("types", [])
    if "fast_food_restaurant" in types or "meal_delivery" in types:
        return None

    address = place.get("formattedAddress", "")
    loc = place.get("location", {})
    rating = place.get("rating")
    price_raw = place.get("priceLevel")
    price_int = None
    if price_raw:
        price_map = {
            "PRICE_LEVEL_FREE": 0, "PRICE_LEVEL_INEXPENSIVE": 1,
            "PRICE_LEVEL_MODERATE": 2, "PRICE_LEVEL_EXPENSIVE": 3,
            "PRICE_LEVEL_VERY_EXPENSIVE": 4,
        }
        price_int = price_map.get(price_raw, 2)

    return {
        "name": name,
        "address": address,
        "neighborhood": neighborhood,
        "borough": classify_borough(address) if address else borough,
        "latitude": loc.get("latitude"),
        "longitude": loc.get("longitude"),
        "vibe": classify_vibe(name, types, price_int, rating),
        "price_tier": price_tier(price_int),
        "website_url": place.get("websiteUri"),
        "google_maps_url": place.get("googleMapsUri"),
        "google_place_id": place.get("id"),
        "source": "google_places",
        "is_active": True,
    }


def seed_neighborhoods(neighborhoods: dict[str, list[str]], save_path: str = "data/happy_hours_raw.json"):
    """Run Places API searches for given neighborhoods."""
    if not GOOGLE_PLACES_API_KEY:
        logger.error("GOOGLE_PLACES_API_KEY not set. Add it to .env.local")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    all_places = []
    seen_ids = set()
    queries_run = 0
    chains_filtered = 0

    for borough, hoods in neighborhoods.items():
        for hood in hoods:
            for query_template in SEARCH_QUERIES:
                query = query_template.format(neighborhood=hood)
                logger.info(f"Searching: {query[:60]}")

                places = search_places(query, GOOGLE_PLACES_API_KEY)
                queries_run += 1

                for place in places:
                    pid = place.get("id")
                    if pid in seen_ids:
                        continue
                    seen_ids.add(pid)

                    row = place_to_row(place, hood, borough)
                    if row is None:
                        chains_filtered += 1
                        continue
                    all_places.append(row)

                time.sleep(1)  # Rate limit

            logger.info(f"  {hood}: {len(all_places)} total unique places so far")

    # Save raw data
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(all_places, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved {len(all_places)} places to {save_path}")

    # Upsert to Supabase
    upserted = 0
    errors = 0
    for row in all_places:
        try:
            supabase.table("happy_hours").upsert(row, on_conflict="google_place_id").execute()
            upserted += 1
        except Exception as e:
            # Try name+address conflict
            try:
                row_copy = {k: v for k, v in row.items() if k != "google_place_id"}
                supabase.table("happy_hours").upsert(row_copy, on_conflict="name,address").execute()
                upserted += 1
            except Exception:
                errors += 1
                if errors <= 5:
                    logger.warning(f"Upsert error: {row['name']}: {e}")

    logger.info(f"Upserted: {upserted}, Errors: {errors}, Chains filtered: {chains_filtered}")
    logger.info(f"Queries run: {queries_run}")
    return all_places


if __name__ == "__main__":
    import sys
    # Default: test with 3 neighborhoods
    test_mode = "--test" in sys.argv or "--full" not in sys.argv

    if test_mode:
        logger.info("TEST MODE: 3 neighborhoods only")
        test_hoods = {
            "Manhattan": ["East Village", "West Village"],
            "Brooklyn": ["Williamsburg"],
        }
        seed_neighborhoods(test_hoods)
    else:
        logger.info("FULL MODE: all neighborhoods")
        seed_neighborhoods(NEIGHBORHOODS)
