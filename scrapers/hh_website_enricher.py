"""Fetch venue websites and extract happy hour specials, times, and details."""

import logging
import time
import re
import requests
from supabase import create_client
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

HH_KEYWORDS = ["happy hour", "specials", "happy-hour", "promotions", "drink deals"]
TIME_PATTERN = re.compile(
    r'(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*(?:to|-|–|—)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))'
)
PRICE_PATTERN = re.compile(r'\$\d+(?:\.\d{2})?')
DISCOUNT_PATTERN = re.compile(r'(?:half[- ]?price|50%\s*off|half\s+off|2[- ]for[- ]1|buy\s+one\s+get|bogo)', re.IGNORECASE)
DAY_PATTERN = re.compile(
    r'(?:mon|tue|wed|thu|fri|sat|sun)(?:day|s)?'
    r'(?:\s*(?:-|to|–|through)\s*(?:mon|tue|wed|thu|fri|sat|sun)(?:day|s)?)?',
    re.IGNORECASE,
)

DRINK_WORDS = {
    "beer", "wine", "cocktail", "margarita", "martini", "well", "draft",
    "pour", "spritz", "shot", "mule", "sangria", "mimosa", "prosecco",
    "espresso martini", "negroni", "highball", "pint", "glass of",
}
FOOD_WORDS = {
    "oyster", "burger", "slider", "wing", "fries", "taco",
    "pizza", "appetizer", "app", "flatbread", "nacho",
    "dumpling", "shrimp", "calamari", "bruschetta",
    "happy hour menu", "happy hour food", "bar bites", "bar snacks",
    "half-price appetizers", "half price apps", "$1 oysters",
    "food special", "small plates", "shareables",
    "complimentary", "free snacks", "free bites",
    "pretzel", "meatball", "crostini", "arancini", "edamame",
    "quesadilla", "empanada", "ceviche", "tartare",
}


def has_price_indicator(text: str) -> bool:
    """Return True if text contains a dollar amount or discount phrase."""
    return bool(PRICE_PATTERN.search(text)) or bool(DISCOUNT_PATTERN.search(text))


def clean_text(text: str) -> str:
    """Strip HTML, normalize whitespace, cap length."""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def fetch_page(url):
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15, allow_redirects=True)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass
    return None


def find_hh_page(base_url):
    if not base_url:
        return None, None

    html = fetch_page(base_url)
    if not html:
        return None, None

    if any(kw in html.lower() for kw in HH_KEYWORDS):
        return base_url, html

    base = base_url.rstrip("/")
    for path in ["/happy-hour", "/specials", "/menu", "/drinks", "/promotions", "/happyhour"]:
        subpage_html = fetch_page(base + path)
        if subpage_html and any(kw in subpage_html.lower() for kw in HH_KEYWORDS):
            return base + path, subpage_html

    return base_url, html


def extract_specials(html):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")

    # Find paragraphs/sections mentioning happy hour
    hh_text = ""
    for el in soup.find_all(["p", "li", "div", "span", "td", "h2", "h3", "h4"]):
        t = el.get_text(strip=True)
        if any(kw in t.lower() for kw in HH_KEYWORDS) and len(t) < 500:
            hh_text += " " + t

    if not hh_text:
        hh_text = soup.get_text(" ", strip=True)[:3000]

    # Extract times
    times = TIME_PATTERN.findall(hh_text)
    start_time = times[0][0] if times else ""
    end_time = times[0][1] if times else ""

    # Extract days
    days_found = DAY_PATTERN.findall(hh_text)
    days = list(set(d.strip().title() for d in days_found))

    # Extract specials: only keep sentences with price indicators
    drink_specials = []
    food_specials = []

    for sentence in re.split(r'[.;\n]', hh_text):
        s = clean_text(sentence)
        if len(s) < 8 or len(s) > 200:
            continue
        sl = s.lower()

        if not has_price_indicator(s):
            continue

        # Check for drink keywords
        if any(w in sl for w in DRINK_WORDS):
            drink_specials.append(s)

        # Check for food keywords
        if any(w in sl for w in FOOD_WORDS):
            food_specials.append(s)

    # Also scan for food-near-price patterns even without sentence split
    hh_lower = hh_text.lower()
    for food_kw in FOOD_WORDS:
        if food_kw in hh_lower:
            # Find context around the food keyword
            idx = hh_lower.index(food_kw)
            window = hh_text[max(0, idx - 60):idx + 80]
            window = clean_text(window)
            if has_price_indicator(window) and len(window) <= 200:
                if window not in food_specials:
                    food_specials.append(window)

    return {
        "start_time": start_time,
        "end_time": end_time,
        "days": days,
        "drink_specials": "; ".join(drink_specials[:5])[:500] if drink_specials else "",
        "food_specials": "; ".join(food_specials[:5])[:500] if food_specials else "",
    }


def enrich():
    logger.info("Enriching happy hours from venue websites...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    result = supabase.table("happy_hours").select(
        "id,name,website_url,drink_specials,food_specials,start_time"
    ).eq("is_active", True).not_.is_("website_url", "null").execute()

    entries = result.data or []
    to_enrich = [e for e in entries if not e.get("drink_specials") and not e.get("start_time")]
    logger.info(f"  {len(to_enrich)} entries need enrichment (of {len(entries)} with websites)")

    enriched = 0
    for i, entry in enumerate(to_enrich):
        url = entry["website_url"]
        logger.info(f"  [{i+1}/{len(to_enrich)}] {entry['name'][:40]}...")

        _, html = find_hh_page(url)
        if not html:
            continue

        specials = extract_specials(html)

        update = {}
        # Only store drink specials if they contain actual price info
        if specials["drink_specials"] and has_price_indicator(specials["drink_specials"]):
            update["drink_specials"] = specials["drink_specials"]
        if specials["food_specials"] and has_price_indicator(specials["food_specials"]):
            update["food_specials"] = specials["food_specials"]
            update["has_food_specials"] = True
        if specials["start_time"]:
            update["start_time"] = specials["start_time"]
        if specials["end_time"]:
            update["end_time"] = specials["end_time"]
        if specials["days"]:
            update["days"] = specials["days"]

        if update:
            supabase.table("happy_hours").update(update).eq("id", entry["id"]).execute()
            enriched += 1

        time.sleep(2)

    logger.info(f"  Enriched {enriched} entries from websites")
    return enriched


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    enrich()
