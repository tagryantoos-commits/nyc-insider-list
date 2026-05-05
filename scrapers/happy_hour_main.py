"""NYC Happy Hour Pipeline — main orchestrator.

Usage:
    python scrapers/happy_hour_main.py                  # Test: 3 neighborhoods
    python scrapers/happy_hour_main.py --full            # All neighborhoods
    python scrapers/happy_hour_main.py --enrich-only     # Skip Places seed, just enrich
    python scrapers/happy_hour_main.py --source eater    # One enricher only
"""

import argparse
import logging
import sys
import os

# Add scrapers dir to path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from supabase import create_client
from hh_config import SUPABASE_URL, SUPABASE_KEY, NEIGHBORHOODS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def print_report():
    """Print database stats."""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    total = supabase.table("happy_hours").select("id", count="exact").eq("is_active", True).execute()
    logger.info(f"\n{'='*60}")
    logger.info(f"HAPPY HOUR DATABASE REPORT")
    logger.info(f"{'='*60}")
    logger.info(f"Total active: {total.count}")

    # By borough
    for borough in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
        r = supabase.table("happy_hours").select("id", count="exact").eq("borough", borough).eq("is_active", True).execute()
        logger.info(f"  {borough}: {r.count}")

    # By vibe
    logger.info("\nBy vibe:")
    result = supabase.table("happy_hours").select("vibe").eq("is_active", True).execute()
    vibes = {}
    for r in (result.data or []):
        v = r.get("vibe") or "unknown"
        vibes[v] = vibes.get(v, 0) + 1
    for v, c in sorted(vibes.items(), key=lambda x: -x[1]):
        logger.info(f"  {v}: {c}")

    # Top neighborhoods
    logger.info("\nTop 20 neighborhoods:")
    hoods = {}
    result = supabase.table("happy_hours").select("neighborhood").eq("is_active", True).execute()
    for r in (result.data or []):
        h = r.get("neighborhood") or "Unknown"
        hoods[h] = hoods.get(h, 0) + 1
    for h, c in sorted(hoods.items(), key=lambda x: -x[1])[:20]:
        logger.info(f"  {h}: {c}")

    # Specials stats
    food = supabase.table("happy_hours").select("id", count="exact").eq("has_food_specials", True).eq("is_active", True).execute()
    music = supabase.table("happy_hours").select("id", count="exact").eq("has_live_music", True).eq("is_active", True).execute()
    outdoor = supabase.table("happy_hours").select("id", count="exact").eq("has_outdoor_seating", True).eq("is_active", True).execute()
    logger.info(f"\nWith food specials: {food.count}")
    logger.info(f"With live music: {music.count}")
    logger.info(f"With outdoor seating: {outdoor.count}")

    # Quality
    result = supabase.table("happy_hours").select("quality_score").eq("is_active", True).execute()
    scores = [r.get("quality_score", 0) for r in (result.data or [])]
    avg = sum(scores) / len(scores) if scores else 0
    logger.info(f"Average quality score: {avg:.1f}/10")

    # By source
    logger.info("\nBy source:")
    sources = {}
    result = supabase.table("happy_hours").select("source").eq("is_active", True).execute()
    for r in (result.data or []):
        s = r.get("source") or "unknown"
        sources[s] = sources.get(s, 0) + 1
    for s, c in sorted(sources.items(), key=lambda x: -x[1]):
        logger.info(f"  {s}: {c}")

    logger.info(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="NYC Happy Hour Pipeline")
    parser.add_argument("--full", action="store_true", help="Run all neighborhoods (costs ~$25 in Places API)")
    parser.add_argument("--enrich-only", action="store_true", help="Skip Places seed")
    parser.add_argument("--source", type=str, help="Run only one enricher: infatuation, eater, timeout, website")
    parser.add_argument("--report", action="store_true", help="Just print the report")
    args = parser.parse_args()

    if args.report:
        print_report()
        return

    logger.info("=" * 60)
    logger.info("NYC HAPPY HOUR PIPELINE")
    logger.info("=" * 60)

    # Step 1: Google Places seed
    if not args.enrich_only and not args.source:
        from happy_hour_places import seed_neighborhoods
        if args.full:
            logger.info("\n--- Step 1: Google Places seed (ALL neighborhoods) ---")
            seed_neighborhoods(NEIGHBORHOODS)
        else:
            logger.info("\n--- Step 1: Google Places seed (TEST: 3 neighborhoods) ---")
            test_hoods = {
                "Manhattan": ["East Village", "West Village"],
                "Brooklyn": ["Williamsburg"],
            }
            seed_neighborhoods(test_hoods)

    # Step 2: Aggregator scrapers
    if args.source:
        sources = [args.source]
    else:
        sources = ["infatuation", "eater", "timeout"]

    for source in sources:
        try:
            if source == "infatuation":
                logger.info("\n--- Step 2a: Infatuation ---")
                from hh_infatuation import scrape as scrape_infatuation
                scrape_infatuation()
            elif source == "eater":
                logger.info("\n--- Step 2b: Eater ---")
                from hh_eater import scrape as scrape_eater
                scrape_eater()
            elif source == "timeout":
                logger.info("\n--- Step 2c: TimeOut ---")
                from hh_timeout import scrape as scrape_timeout
                scrape_timeout()
            elif source == "website":
                logger.info("\n--- Step 3: Website enricher ---")
                from hh_website_enricher import enrich
                enrich()
        except Exception as e:
            logger.error(f"  {source} failed: {e}")

    # Step 3: Website enricher (unless running a single source)
    if not args.source:
        try:
            logger.info("\n--- Step 3: Website enricher ---")
            from hh_website_enricher import enrich
            enrich()
        except Exception as e:
            logger.error(f"  Website enricher failed: {e}")

    # Step 4: Quality pipeline
    if not args.source:
        logger.info("\n--- Step 4: Quality pipeline ---")
        from hh_quality import run_quality_pipeline
        run_quality_pipeline()

    # Report
    print_report()


if __name__ == "__main__":
    main()
