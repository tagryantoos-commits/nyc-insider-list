"""Quality scoring, deduplication, and chain detection for happy hours."""

import logging
from thefuzz import fuzz
from supabase import create_client
from hh_config import SUPABASE_URL, SUPABASE_KEY, CHAINS

logger = logging.getLogger(__name__)


def calculate_score(entry: dict) -> int:
    score = 0
    if entry.get("food_specials"):
        score += 2
    if entry.get("drink_specials") and "$" in (entry.get("drink_specials") or ""):
        score += 2
    if entry.get("has_entertainment") or entry.get("has_live_music"):
        score += 1
    if entry.get("has_outdoor_seating"):
        score += 1
    if entry.get("start_time"):
        score += 1
    if entry.get("website_url"):
        score += 1
    if entry.get("source") in ("infatuation", "eater", "timeout"):
        score += 2
    # Penalties
    for field in ("address", "neighborhood", "vibe"):
        if not entry.get(field):
            score -= 1
    return max(0, min(10, score))


def deduplicate(supabase):
    """Remove fuzzy duplicates, keeping the entry with more data."""
    logger.info("Running deduplication...")
    result = supabase.table("happy_hours").select("*").eq("is_active", True).execute()
    entries = result.data or []

    to_delete = set()
    for i in range(len(entries)):
        if entries[i]["id"] in to_delete:
            continue
        for j in range(i + 1, len(entries)):
            if entries[j]["id"] in to_delete:
                continue

            name_score = fuzz.token_sort_ratio(
                entries[i]["name"].lower(), entries[j]["name"].lower()
            )
            if name_score < 85:
                continue

            addr_i = (entries[i].get("address") or "").lower()
            addr_j = (entries[j].get("address") or "").lower()
            if addr_i and addr_j:
                addr_score = fuzz.token_sort_ratio(addr_i, addr_j)
                if addr_score < 70:
                    continue

            # Keep the one with more data
            score_i = calculate_score(entries[i])
            score_j = calculate_score(entries[j])
            loser = entries[j]["id"] if score_i >= score_j else entries[i]["id"]
            to_delete.add(loser)
            logger.info(f"  Dupe: '{entries[i]['name'][:30]}' vs '{entries[j]['name'][:30]}' -> removing loser")

    # Delete duplicates
    for eid in to_delete:
        supabase.table("happy_hours").delete().eq("id", eid).execute()

    logger.info(f"  Removed {len(to_delete)} duplicates")
    return len(to_delete)


def score_all(supabase):
    """Calculate quality scores for all active entries."""
    logger.info("Calculating quality scores...")
    result = supabase.table("happy_hours").select("*").eq("is_active", True).execute()
    entries = result.data or []

    for entry in entries:
        score = calculate_score(entry)
        if score != entry.get("quality_score", 0):
            supabase.table("happy_hours").update(
                {"quality_score": score}
            ).eq("id", entry["id"]).execute()

    scores = [calculate_score(e) for e in entries]
    avg = sum(scores) / len(scores) if scores else 0
    logger.info(f"  Scored {len(entries)} entries, avg: {avg:.1f}")
    return avg


def chain_recheck(supabase):
    """Flag any chains that slipped through."""
    logger.info("Chain detection recheck...")
    result = supabase.table("happy_hours").select("id,name").eq("is_active", True).execute()
    entries = result.data or []

    flagged = []
    for entry in entries:
        n = entry["name"].lower()
        if any(chain in n for chain in CHAINS):
            flagged.append(entry)
            supabase.table("happy_hours").update({"is_active": False}).eq("id", entry["id"]).execute()

    if flagged:
        logger.info(f"  Flagged {len(flagged)} chains:")
        for f in flagged:
            logger.info(f"    - {f['name']}")
    else:
        logger.info("  No chains found")

    return flagged


def run_quality_pipeline():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    chain_recheck(supabase)
    deduplicate(supabase)
    score_all(supabase)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    run_quality_pipeline()
