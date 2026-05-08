"""Tests for the NYC sports scraper.

Tests each team scraper individually, validates data quality,
checks for common issues, and runs the full pipeline.

Usage:
    python scrapers/test_sports.py           # Run all tests
    python scrapers/test_sports.py --team yankees  # Test one team
    python scrapers/test_sports.py --quick   # API connectivity only
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

TODAY = date.today()
DATE_END = TODAY + timedelta(days=90)

PASS = 0
FAIL = 0
WARNINGS = []


def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        logger.info(f"  [PASS] {name}")
    else:
        FAIL += 1
        logger.error(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))


def warn(msg):
    WARNINGS.append(msg)
    logger.warning(f"  [WARN] {msg}")


# ── Individual team tests ──────────────────────────────────

def test_mlb(team_key):
    from sports_events import scrape_mlb, TEAMS
    team = TEAMS[team_key]
    logger.info(f"\n--- Testing MLB: {team['name']} ---")

    events = scrape_mlb(team_key)
    check(f"{team['name']} returns events", len(events) > 0, f"got {len(events)}")

    if not events:
        warn(f"{team['name']}: 0 events -- MLB API may be down or off-season")
        return events

    # Validate event structure
    ev = events[0]
    check(f"{team['name']} has title", bool(ev.get("title")))
    check(f"{team['name']} has date", bool(ev.get("date")))
    check(f"{team['name']} has venue", bool(ev.get("venue")))
    check(f"{team['name']} has source", ev.get("source") == f"sports_{team_key}")
    check(f"{team['name']} category is Sports", ev.get("category") == "Sports")

    # Date validation
    for e in events:
        d = e.get("date", "")
        check(f"{team['name']} date format YYYY-MM-DD", len(d) == 10 and d[4] == "-", d)
        if d:
            check(f"{team['name']} date is future", d >= TODAY.isoformat(), f"date={d}")
        break  # Only check first

    # Title should contain "vs"
    check(f"{team['name']} title has 'vs'", "vs" in ev["title"].lower(), ev["title"])

    # No garbled titles (common issue with Barclays scraper)
    for e in events:
        title = e["title"]
        has_date_prefix = any(m in title for m in ["May0", "Jun0", "Jul0", "Aug0", "May1", "Jun1"])
        check(f"No garbled title: {title[:40]}", not has_date_prefix, title[:60])
        break

    # Check for duplicates
    titles_dates = [(e["title"], e["date"]) for e in events]
    dupes = len(titles_dates) - len(set(titles_dates))
    check(f"{team['name']} no duplicate events", dupes == 0, f"{dupes} duplicates")

    logger.info(f"  {team['name']}: {len(events)} events validated")
    return events


def test_nba(team_key):
    from sports_events import scrape_nba, TEAMS
    team = TEAMS[team_key]
    logger.info(f"\n--- Testing NBA: {team['name']} ---")

    events = scrape_nba(team_key)

    # NBA/Nets season may be over -- 0 is acceptable
    if len(events) == 0:
        warn(f"{team['name']}: 0 events -- season may be over (OK for May-Sep)")
        return events

    check(f"{team['name']} returns events", len(events) > 0, f"got {len(events)}")

    ev = events[0]
    check(f"{team['name']} has title", bool(ev.get("title")))
    check(f"{team['name']} has date", bool(ev.get("date")))
    check(f"{team['name']} has venue", bool(ev.get("venue")))
    check(f"{team['name']} source correct", ev.get("source") == f"sports_{team_key}")

    # Only home games
    for e in events:
        check(f"{team['name']} is home game", team["name"] in e["title"].split(" vs ")[0] if " vs " in e["title"] else True, e["title"])
        break

    logger.info(f"  {team['name']}: {len(events)} events validated")
    return events


def test_nhl(team_key):
    from sports_events import scrape_nhl, TEAMS
    team = TEAMS[team_key]
    logger.info(f"\n--- Testing NHL: {team['name']} ---")

    events = scrape_nhl(team_key)

    if len(events) == 0:
        warn(f"{team['name']}: 0 events -- season may be over (OK for May-Sep)")
        return events

    check(f"{team['name']} returns events", len(events) > 0)

    ev = events[0]
    check(f"{team['name']} has title", bool(ev.get("title")))
    check(f"{team['name']} has date", bool(ev.get("date")))
    check(f"{team['name']} source correct", ev.get("source") == f"sports_{team_key}")

    logger.info(f"  {team['name']}: {len(events)} events validated")
    return events


def test_wnba():
    from sports_events import scrape_nba, TEAMS
    team = TEAMS["liberty"]
    logger.info(f"\n--- Testing WNBA: {team['name']} ---")

    events = scrape_nba("liberty")

    if len(events) == 0:
        warn(f"{team['name']}: 0 events -- WNBA season starts May, check if in-season")
        return events

    check(f"{team['name']} returns events", len(events) > 0, f"got {len(events)}")

    if events:
        ev = events[0]
        check(f"{team['name']} has title", bool(ev.get("title")))
        check(f"{team['name']} has date", bool(ev.get("date")))
        check(f"{team['name']} venue is Barclays", "Barclays" in ev.get("venue", ""), ev.get("venue"))
        check(f"{team['name']} source correct", ev.get("source") == "sports_liberty")

    logger.info(f"  {team['name']}: {len(events)} events validated")
    return events


def test_mls(team_key):
    from sports_events import scrape_mls, TEAMS
    team = TEAMS[team_key]
    logger.info(f"\n--- Testing MLS: {team['name']} ---")

    start = time.time()
    events = scrape_mls(team_key)
    elapsed = time.time() - start

    check(f"{team['name']} returns events", len(events) > 0, f"got {len(events)}")
    check(f"{team['name']} completes in <3min", elapsed < 180, f"took {elapsed:.0f}s")

    if events:
        ev = events[0]
        check(f"{team['name']} has title", bool(ev.get("title")))
        check(f"{team['name']} has date", bool(ev.get("date")))
        check(f"{team['name']} has venue", bool(ev.get("venue")))
        check(f"{team['name']} source correct", ev.get("source") == f"sports_{team_key}")
        check(f"{team['name']} title has 'vs'", "vs" in ev["title"], ev["title"])

        # Verify dates are future
        for e in events:
            d = e.get("date", "")
            if d:
                check(f"{team['name']} date {d} is future", d >= TODAY.isoformat(), d)

    logger.info(f"  {team['name']}: {len(events)} events in {elapsed:.0f}s")
    return events


# ── Integration tests ──────────────────────────────────────

def test_full_pipeline():
    from sports_events import scrape_all_sports
    logger.info(f"\n{'='*60}")
    logger.info("INTEGRATION TEST: Full pipeline")
    logger.info(f"{'='*60}")

    start = time.time()
    results = scrape_all_sports()
    elapsed = time.time() - start

    check("Pipeline completes without crash", True)
    check("Pipeline returns results dict", isinstance(results, dict))
    check("Pipeline has 'scraped' key", "scraped" in results)
    check("Pipeline has 'teams' key", "teams" in results)
    check(f"Total events > 50", results.get("scraped", 0) > 50, f"got {results.get('scraped', 0)}")
    check(f"Pipeline < 10min", elapsed < 600, f"took {elapsed:.0f}s")
    check("0 errors on upsert", results.get("errors", -1) == 0, f"errors: {results.get('errors')}")

    # Check team breakdown
    teams = results.get("teams", {})
    check("Yankees have games", isinstance(teams.get("yankees"), int) and teams["yankees"] > 0, f"yankees: {teams.get('yankees')}")
    check("Mets have games", isinstance(teams.get("mets"), int) and teams["mets"] > 0, f"mets: {teams.get('mets')}")

    # MLS should have at least some games in season (Feb-Oct)
    nycfc = teams.get("nycfc", 0)
    redbulls = teams.get("redbulls", 0)
    if isinstance(nycfc, int) and isinstance(redbulls, int):
        check("MLS teams have games (combined)", nycfc + redbulls > 0, f"nycfc={nycfc}, redbulls={redbulls}")

    logger.info(f"\n  Pipeline completed in {elapsed:.0f}s")
    logger.info(f"  Results: {json.dumps(results, default=str)[:300]}")
    return results


def test_data_quality():
    """Check what's actually in Supabase after the pipeline."""
    logger.info(f"\n{'='*60}")
    logger.info("DATA QUALITY: Checking Supabase")
    logger.info(f"{'='*60}")

    from hh_config import SUPABASE_URL, SUPABASE_KEY
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    result = supabase.table("events").select("title,date,venue,source,borough").eq("category", "Sports").execute()
    events = result.data or []
    logger.info(f"  Total sports events in DB: {len(events)}")

    check("Sports events exist in DB", len(events) > 50, f"got {len(events)}")

    # Check for garbled titles
    garbled = [e for e in events if any(m in e["title"] for m in ["May0", "Jun0", "Jul0", "May1"])]
    check("No garbled titles in DB", len(garbled) == 0, f"{len(garbled)} garbled: {[g['title'][:40] for g in garbled[:3]]}")

    # Check boroughs are set
    with_borough = [e for e in events if e.get("borough")]
    check("Borough populated", len(with_borough) == len(events), f"{len(with_borough)}/{len(events)} have borough")

    # Check sources
    sources = {}
    for e in events:
        s = e.get("source", "?")
        sources[s] = sources.get(s, 0) + 1
    logger.info(f"  Sources: {sources}")

    # Check for past events
    past = [e for e in events if e.get("date", "") < TODAY.isoformat()]
    check("No past events", len(past) == 0, f"{len(past)} past events found")

    # Check for duplicates
    keys = [(e["title"], e["date"]) for e in events]
    dupes = len(keys) - len(set(keys))
    check("No duplicates", dupes == 0, f"{dupes} duplicates")


# ── API connectivity tests ─────────────────────────────────

def test_api_connectivity():
    """Quick test: just check if the APIs respond."""
    import requests
    logger.info(f"\n{'='*60}")
    logger.info("API CONNECTIVITY")
    logger.info(f"{'='*60}")

    apis = [
        ("MLB Stats API", "https://statsapi.mlb.com/api/v1/schedule?teamId=147&startDate=2026-05-07&endDate=2026-05-08&sportId=1"),
        ("ESPN NBA", "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/ny/schedule"),
        ("ESPN WNBA", "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/ny/schedule"),
        ("NHL API", "https://api-web.nhle.com/v1/club-schedule-season/NYR/20252026"),
        ("ESPN NHL", "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/nyr/schedule"),
        ("ESPN MLS scoreboard", f"https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates={TODAY.strftime('%Y%m%d')}"),
    ]

    import requests as http_requests
    for name, url in apis:
        try:
            resp = http_requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
            check(f"{name} responds", resp.status_code == 200, f"HTTP {resp.status_code}")
        except Exception as e:
            check(f"{name} responds", False, str(e)[:60])


# ── Main ───────────────────────────────────────────────────

def main():
    global PASS, FAIL, WARNINGS

    parser = argparse.ArgumentParser(description="Test NYC sports scrapers")
    parser.add_argument("--team", type=str, help="Test one team only")
    parser.add_argument("--quick", action="store_true", help="API connectivity only")
    parser.add_argument("--no-pipeline", action="store_true", help="Skip full pipeline test")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("NYC SPORTS SCRAPER TESTS")
    logger.info("=" * 60)

    if args.quick:
        test_api_connectivity()
    elif args.team:
        team = args.team
        if team in ("yankees", "mets"):
            test_mlb(team)
        elif team in ("knicks", "nets"):
            test_nba(team)
        elif team in ("rangers", "islanders"):
            test_nhl(team)
        elif team == "liberty":
            test_wnba()
        elif team in ("nycfc", "redbulls"):
            test_mls(team)
        else:
            logger.error(f"Unknown team: {team}")
    else:
        # Run all tests
        test_api_connectivity()
        test_mlb("yankees")
        test_mlb("mets")
        test_nba("knicks")
        test_nba("nets")
        test_nhl("rangers")
        test_nhl("islanders")
        test_wnba()
        test_mls("nycfc")
        test_mls("redbulls")

        if not args.no_pipeline:
            test_full_pipeline()
            test_data_quality()

    # Report
    logger.info(f"\n{'='*60}")
    logger.info("TEST RESULTS")
    logger.info(f"{'='*60}")
    logger.info(f"  Passed:   {PASS}")
    logger.info(f"  Failed:   {FAIL}")
    logger.info(f"  Warnings: {len(WARNINGS)}")
    if WARNINGS:
        for w in WARNINGS:
            logger.info(f"    - {w}")
    logger.info(f"{'='*60}")

    return FAIL == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
