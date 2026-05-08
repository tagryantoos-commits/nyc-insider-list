"""Weekly cron job for NYC Insider List.

Runs every Sunday at 11 PM ET.

1. Scrape rooftop events -> push to Google Calendar + Supabase
2. Run happy hour enricher -> update Supabase
3. Clean up past events across all categories
4. Log results + send summary notification

Usage:
    python scrapers/weekly_cron.py           # Full run
    python scrapers/weekly_cron.py --rooftop # Rooftop only
    python scrapers/weekly_cron.py --status  # Print last run status

Kill switch: set CRON_PAUSED=true in .env.local to skip execution.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY

# Kill switch
CRON_PAUSED = os.environ.get("CRON_PAUSED", "false").lower() == "true"

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
LOG_FILE = os.path.join(LOG_DIR, "weekly_cron.log")
STATUS_FILE = os.path.join(LOG_DIR, "cron_status.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


def save_status(results):
    os.makedirs(LOG_DIR, exist_ok=True)
    status = {
        "last_run": datetime.now().isoformat(),
        "results": results,
        "success": not any(
            isinstance(v, dict) and "error" in v
            for v in results.values()
        ),
    }
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2, default=str)


def print_status():
    if not os.path.exists(STATUS_FILE):
        print("No previous run found.")
        return
    with open(STATUS_FILE) as f:
        status = json.load(f)
    print(f"Last run: {status.get('last_run', '?')}")
    print(f"Success: {status.get('success', '?')}")
    print(json.dumps(status.get("results", {}), indent=2))


def cleanup_all_past_events():
    """Deactivate events older than 7 days across all categories."""
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    # Delete old scraper-sourced events (keep manual_curated)
    result = supabase.table("events").delete().lt(
        "date", cutoff
    ).not_.eq("source", "manual_curated").execute()
    deleted = len(result.data) if result.data else 0

    logger.info(f"  Cleanup: deleted {deleted} past events (before {cutoff})")
    return {"deleted": deleted, "cutoff": cutoff}


def run_weekly(rooftop_only=False):
    if CRON_PAUSED:
        logger.info("CRON_PAUSED is true. Exiting.")
        save_status({"status": "paused"})
        return

    logger.info(f"{'='*60}")
    logger.info(f"WEEKLY CRON START: {datetime.now().isoformat()}")
    logger.info(f"{'='*60}")

    results = {}

    # 1. Rooftop events
    try:
        logger.info("\n--- Step 1: Rooftop Events ---")
        from rooftop_events import scrape_all_rooftop_events
        results["rooftop"] = scrape_all_rooftop_events()
    except Exception as e:
        logger.error(f"Rooftop scraper failed: {e}", exc_info=True)
        results["rooftop"] = {"error": str(e)}

    if rooftop_only:
        save_status(results)
        logger.info(f"\n{'='*60}")
        logger.info("WEEKLY CRON COMPLETE (rooftop only)")
        logger.info(f"{'='*60}")
        return results

    # 2. Kid-friendly events
    try:
        logger.info("\n--- Step 2: Kid-Friendly Events ---")
        from kid_friendly_events import scrape_all_kid_events
        results["kid_friendly"] = scrape_all_kid_events()
    except Exception as e:
        logger.error(f"Kid-friendly scraper failed: {e}", exc_info=True)
        results["kid_friendly"] = {"error": str(e)}

    # 3. Museum events
    try:
        logger.info("\n--- Step 3: Museum Events ---")
        from museum_events import scrape_all_museum_events
        results["museums"] = scrape_all_museum_events()
    except Exception as e:
        logger.error(f"Museum scraper failed: {e}", exc_info=True)
        results["museums"] = {"error": str(e)}

    # 4. Comedy events
    try:
        logger.info("\n--- Step 4: Comedy Events ---")
        from comedy_events import scrape_all_comedy_events
        results["comedy"] = scrape_all_comedy_events()
    except Exception as e:
        logger.error(f"Comedy scraper failed: {e}", exc_info=True)
        results["comedy"] = {"error": str(e)}

    # 5. Broadway shows
    try:
        logger.info("\n--- Step 5: Broadway Shows ---")
        from broadway_events import scrape_all_broadway
        results["broadway"] = scrape_all_broadway()
    except Exception as e:
        logger.error(f"Broadway scraper failed: {e}", exc_info=True)
        results["broadway"] = {"error": str(e)}

    # 6. Free events (recurring free nights + Eventbrite free)
    try:
        logger.info("\n--- Step 6: Free Events ---")
        from free_events import scrape_all_free_events
        results["free_events"] = scrape_all_free_events()
    except Exception as e:
        logger.error(f"Free events scraper failed: {e}", exc_info=True)
        results["free_events"] = {"error": str(e)}

    # 7. External scrapers (sports, concerts, festivals)
    try:
        logger.info("\n--- Step 7: External Scrapers (Sports/Concerts/Festivals) ---")
        from run_external_scrapers import run_all_external
        results["external"] = run_all_external()
    except Exception as e:
        logger.error(f"External scrapers failed: {e}", exc_info=True)
        results["external"] = {"error": str(e)}

    # 8. Happy hour enricher
    try:
        logger.info("\n--- Step 8: Happy Hour Enricher ---")
        from hh_website_enricher import enrich
        enriched = enrich()
        results["happy_hours"] = {"enriched": enriched}
    except Exception as e:
        logger.error(f"Happy hour enricher failed: {e}", exc_info=True)
        results["happy_hours"] = {"error": str(e)}

    # 9. Cleanup past events
    try:
        logger.info("\n--- Step 3: Cleanup Past Events ---")
        results["cleanup"] = cleanup_all_past_events()
    except Exception as e:
        logger.error(f"Cleanup failed: {e}", exc_info=True)
        results["cleanup"] = {"error": str(e)}

    # Save status
    save_status(results)

    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("WEEKLY CRON COMPLETE")
    logger.info(f"{'='*60}")
    for step, result in results.items():
        if isinstance(result, dict) and "error" in result:
            logger.error(f"  {step}: FAILED - {result['error']}")
        else:
            logger.info(f"  {step}: {json.dumps(result, default=str)[:200]}")

    return results


def main():
    parser = argparse.ArgumentParser(description="NYC Insider List Weekly Cron")
    parser.add_argument("--rooftop", action="store_true", help="Run rooftop scraper only")
    parser.add_argument("--status", action="store_true", help="Print last run status")
    args = parser.parse_args()

    if args.status:
        print_status()
        return

    run_weekly(rooftop_only=args.rooftop)


if __name__ == "__main__":
    main()
