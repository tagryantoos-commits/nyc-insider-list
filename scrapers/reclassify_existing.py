"""Reclassify vibes and clean junk specials for existing entries."""
import os, sys, re, logging
sys.path.insert(0, os.path.dirname(__file__))
from supabase import create_client
from hh_config import SUPABASE_URL, SUPABASE_KEY
from happy_hour_places import classify_vibe

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

PRICE_RE = re.compile(r'\$\d+')
DISCOUNT_RE = re.compile(r'(?:half[- ]?price|50%\s*off|half\s+off|2[- ]for[- ]1)', re.IGNORECASE)

def has_price(text):
    return bool(PRICE_RE.search(text or "")) or bool(DISCOUNT_RE.search(text or ""))

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Get all entries
result = supabase.table("happy_hours").select("*").eq("is_active", True).execute()
entries = result.data or []
logger.info(f"Reclassifying {len(entries)} entries...")

vibe_changes = 0
specials_cleaned = 0

for e in entries:
    update = {}

    # Reclassify vibe
    old_vibe = e.get("vibe")
    # We don't have the original Google types, so classify from name + what we have
    new_vibe = classify_vibe(e["name"], [], None, None)
    if old_vibe != new_vibe:
        update["vibe"] = new_vibe
        vibe_changes += 1

    # Clean junk specials
    if e.get("drink_specials") and not has_price(e["drink_specials"]):
        update["drink_specials"] = None
        specials_cleaned += 1

    if e.get("food_specials") and not has_price(e["food_specials"]):
        update["food_specials"] = None
        update["has_food_specials"] = False
        specials_cleaned += 1

    if update:
        supabase.table("happy_hours").update(update).eq("id", e["id"]).execute()

logger.info(f"Vibe reclassified: {vibe_changes}")
logger.info(f"Junk specials cleaned: {specials_cleaned}")

# Print new distribution
result = supabase.table("happy_hours").select("vibe").eq("is_active", True).execute()
vibes = {}
for r in (result.data or []):
    v = r.get("vibe") or "unknown"
    vibes[v] = vibes.get(v, 0) + 1
logger.info("New vibe distribution:")
for v, c in sorted(vibes.items(), key=lambda x: -x[1]):
    logger.info(f"  {v}: {c}")
