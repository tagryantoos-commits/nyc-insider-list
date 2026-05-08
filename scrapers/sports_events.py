"""Comprehensive NYC sports scraper covering all major teams.

APIs used:
- MLB Stats API (public, no auth): Yankees, Mets
- NBA API (public): Knicks, Nets
- NHL API (public): Rangers, Islanders
- WNBA API (same as NBA): Liberty
- MLS API (public): NYCFC, Red Bulls
- Barclays Center HTML: catch-all for Nets, Islanders, concerts

Pushes to Supabase events table with category = "Sports".
"""

import json
import logging
import os
import sys
import time
from datetime import date, timedelta, datetime

import requests as http_requests

sys.path.insert(0, os.path.dirname(__file__))
from hh_config import SUPABASE_URL, SUPABASE_KEY, USER_AGENT

logger = logging.getLogger(__name__)

TODAY = date.today()
DATE_START = TODAY.isoformat()
DATE_END = (TODAY + timedelta(days=90)).isoformat()

# ── Team configs ───────────────────────────────────────────

TEAMS = {
    # MLB
    "yankees": {"name": "Yankees", "venue": "Yankee Stadium", "hood": "Concourse", "borough": "Bronx", "league": "mlb", "id": 147},
    "mets": {"name": "Mets", "venue": "Citi Field", "hood": "Flushing", "borough": "Queens", "league": "mlb", "id": 121},
    # NBA
    "knicks": {"name": "Knicks", "venue": "Madison Square Garden", "hood": "Midtown", "borough": "Manhattan", "league": "nba", "id": 1610612752},
    "nets": {"name": "Nets", "venue": "Barclays Center", "hood": "Prospect Heights", "borough": "Brooklyn", "league": "nba", "id": 1610612751},
    # NHL
    "rangers": {"name": "Rangers", "venue": "Madison Square Garden", "hood": "Midtown", "borough": "Manhattan", "league": "nhl", "id": 3},
    "islanders": {"name": "Islanders", "venue": "UBS Arena", "hood": "Elmont", "borough": "Queens", "league": "nhl", "id": 2},
    # WNBA
    "liberty": {"name": "Liberty", "venue": "Barclays Center", "hood": "Prospect Heights", "borough": "Brooklyn", "league": "wnba", "id": 1611661319},
    # MLS
    "nycfc": {"name": "NYCFC", "venue": "Yankee Stadium", "hood": "Concourse", "borough": "Bronx", "league": "mls", "id": "nycfc"},
    "redbulls": {"name": "Red Bulls", "venue": "Red Bull Arena", "hood": "Harrison", "borough": "New Jersey", "league": "mls", "id": "nyrb"},
}


def make_event(title, date_str, time_str, venue, hood, borough, url, desc="", source=""):
    return {
        "title": title,
        "date": date_str,
        "time": time_str,
        "venue": venue,
        "neighborhood": hood,
        "borough": borough,
        "category": "Sports",
        "is_free": False,
        "url": url,
        "description": desc,
        "source": source,
    }


# ── MLB ────────────────────────────────────────────────────

def scrape_mlb(team_key):
    team = TEAMS[team_key]
    logger.info(f"    MLB: {team['name']}...")
    events = []

    try:
        resp = http_requests.get(
            "https://statsapi.mlb.com/api/v1/schedule",
            params={
                "teamId": team["id"],
                "startDate": DATE_START,
                "endDate": DATE_END,
                "sportId": 1,
                "hydrate": "team,venue",
            },
            timeout=15,
        )
        data = resp.json()

        for date_entry in data.get("dates", []):
            for game in date_entry.get("games", []):
                home = game.get("teams", {}).get("home", {}).get("team", {})
                if home.get("id") != team["id"]:
                    continue  # Away game

                away = game.get("teams", {}).get("away", {}).get("team", {})
                game_date = game.get("gameDate", "")
                venue_name = game.get("venue", {}).get("name", team["venue"])

                dt = None
                time_str = None
                if game_date:
                    try:
                        dt = datetime.fromisoformat(game_date.replace("Z", "+00:00"))
                        time_str = dt.strftime("%I:%M %p").lstrip("0")
                    except:
                        pass

                title = f"{team['name']} vs {away.get('name', 'TBD')}"
                # Doubleheader: append game number to avoid duplicate titles
                game_num = game.get("gameNumber", 1)
                same_day = sum(
                    1 for e in events
                    if e["title"] == title and e["date"] == game_date[:10]
                )
                if game_num > 1 or same_day > 0:
                    title += f" (Game {same_day + 1})"
                events.append(make_event(
                    title=title,
                    date_str=game_date[:10],
                    time_str=time_str,
                    venue=venue_name,
                    hood=team["hood"],
                    borough=team["borough"],
                    url=f"https://www.mlb.com/{team_key}/schedule",
                    desc=f"MLB: {title}",
                    source=f"sports_{team_key}",
                ))
    except Exception as e:
        logger.warning(f"    MLB {team['name']} error: {e}")

    return events


# ── NBA / WNBA ────────────────────────────────────────────

def scrape_nba(team_key):
    team = TEAMS[team_key]
    league = team["league"]  # "nba" or "wnba"
    logger.info(f"    {league.upper()}: {team['name']}...")
    events = []

    try:
        # NBA/WNBA schedule API
        if league == "wnba":
            url = f"https://stats.wnba.com/stats/leaguegamefinder?DateFrom={DATE_START}&DateTo={DATE_END}&LeagueID=10&TeamID={team['id']}"
        else:
            url = f"https://stats.nba.com/stats/leaguegamefinder?DateFrom={DATE_START}&DateTo={DATE_END}&LeagueID=00&TeamID={team['id']}"

        # NBA stats API requires specific headers
        headers = {
            "User-Agent": USER_AGENT,
            "Referer": "https://www.nba.com/",
            "Accept": "application/json",
        }

        resp = http_requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            # Fallback: try the CDN schedule
            logger.info(f"      Stats API returned {resp.status_code}, trying CDN...")
            return scrape_nba_cdn(team_key)

        data = resp.json()
        results = data.get("resultSets", [{}])[0]
        col_names = results.get("headers", [])
        rows = results.get("rowSet", [])

        for row in rows:
            row_dict = dict(zip(col_names, row))
            matchup = row_dict.get("MATCHUP", "")
            if "vs." not in matchup:
                continue  # Away game

            game_date = row_dict.get("GAME_DATE", "")[:10]
            opponent = matchup.split("vs.")[-1].strip()
            title = f"{team['name']} vs {opponent}"

            events.append(make_event(
                title=title,
                date_str=game_date,
                time_str=None,
                venue=team["venue"],
                hood=team["hood"],
                borough=team["borough"],
                url=f"https://www.{league}.com/game",
                desc=f"{league.upper()}: {title}",
                source=f"sports_{team_key}",
            ))
    except Exception as e:
        logger.warning(f"    {league.upper()} {team['name']} error: {e}")
        return scrape_nba_cdn(team_key)

    return events


def scrape_nba_cdn(team_key):
    """Fallback: scrape team schedule page or use ESPN API."""
    team = TEAMS[team_key]
    events = []

    # ESPN has a public schedule API
    espn_slugs = {
        "knicks": "ny/new-york-knicks",
        "nets": "bkn/brooklyn-nets",
        "liberty": "ny/new-york-liberty",
    }
    slug = espn_slugs.get(team_key)
    if not slug:
        return events

    try:
        league = "wnba" if team["league"] == "wnba" else "nba"
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/{league}/teams/{slug.split('/')[0]}/schedule"
        resp = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
        data = resp.json()

        for event in data.get("events", []):
            ev_date = event.get("date", "")[:10]
            if ev_date < DATE_START or ev_date > DATE_END:
                continue

            # Only home games
            competitions = event.get("competitions", [{}])
            if not competitions:
                continue
            comp = competitions[0]
            is_home = False
            opponent = ""
            for competitor in comp.get("competitors", []):
                if competitor.get("homeAway") == "home" and team["name"].lower() in competitor.get("team", {}).get("displayName", "").lower():
                    is_home = True
                elif competitor.get("homeAway") == "away":
                    opponent = competitor.get("team", {}).get("displayName", "TBD")

            if not is_home:
                continue

            title = f"{team['name']} vs {opponent}"
            time_str = None
            if "T" in event.get("date", ""):
                try:
                    dt = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
                    time_str = dt.strftime("%I:%M %P").lstrip("0")
                except:
                    pass

            events.append(make_event(
                title=title,
                date_str=ev_date,
                time_str=time_str,
                venue=team["venue"],
                hood=team["hood"],
                borough=team["borough"],
                url=f"https://www.espn.com/{league}/team/schedule/_/name/{slug.split('/')[0]}",
                desc=f"{league.upper()}: {title}",
                source=f"sports_{team_key}",
            ))
    except Exception as e:
        logger.warning(f"    ESPN {team['name']} error: {e}")

    return events


# ── NHL ────────────────────────────────────────────────────

def scrape_nhl(team_key):
    team = TEAMS[team_key]
    logger.info(f"    NHL: {team['name']}...")
    events = []

    try:
        # NHL API v1 (public)
        nhl_abbrevs = {"rangers": "NYR", "islanders": "NYI"}
        abbrev = nhl_abbrevs.get(team_key, "")

        url = f"https://api-web.nhle.com/v1/club-schedule-season/{abbrev}/20252026"
        resp = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)

        if resp.status_code != 200:
            # Try ESPN fallback
            return scrape_nhl_espn(team_key)

        data = resp.json()
        for game in data.get("games", []):
            game_date = game.get("gameDate", "")[:10]
            if game_date < DATE_START or game_date > DATE_END:
                continue

            # Only home games
            home = game.get("homeTeam", {})
            if home.get("abbrev") != abbrev:
                continue

            away = game.get("awayTeam", {})
            away_name = away.get("placeName", {}).get("default", "") + " " + away.get("commonName", {}).get("default", "")
            away_name = away_name.strip() or "TBD"

            title = f"{team['name']} vs {away_name}"
            time_str = None
            start_utc = game.get("startTimeUTC", "")
            if start_utc:
                try:
                    dt = datetime.fromisoformat(start_utc.replace("Z", "+00:00"))
                    time_str = dt.strftime("%I:%M %P").lstrip("0")
                except:
                    pass

            events.append(make_event(
                title=title,
                date_str=game_date,
                time_str=time_str,
                venue=team["venue"],
                hood=team["hood"],
                borough=team["borough"],
                url=f"https://www.nhl.com/{team_key.replace('rangers','newyorkrangers').replace('islanders','newyorkislanders')}/schedule",
                desc=f"NHL: {title}",
                source=f"sports_{team_key}",
            ))
    except Exception as e:
        logger.warning(f"    NHL {team['name']} error: {e}")
        return scrape_nhl_espn(team_key)

    return events


def scrape_nhl_espn(team_key):
    team = TEAMS[team_key]
    events = []
    espn_abbrevs = {"rangers": "nyr", "islanders": "nyi"}
    abbrev = espn_abbrevs.get(team_key, "")
    if not abbrev:
        return events

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{abbrev}/schedule"
        resp = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
        data = resp.json()

        for event in data.get("events", []):
            ev_date = event.get("date", "")[:10]
            if ev_date < DATE_START or ev_date > DATE_END:
                continue
            comp = event.get("competitions", [{}])[0] if event.get("competitions") else {}
            is_home = False
            opponent = ""
            for c in comp.get("competitors", []):
                if c.get("homeAway") == "home" and team["name"].lower() in c.get("team", {}).get("displayName", "").lower():
                    is_home = True
                elif c.get("homeAway") == "away":
                    opponent = c.get("team", {}).get("displayName", "TBD")
            if not is_home:
                continue

            events.append(make_event(
                title=f"{team['name']} vs {opponent}",
                date_str=ev_date,
                time_str=None,
                venue=team["venue"],
                hood=team["hood"],
                borough=team["borough"],
                url=f"https://www.espn.com/nhl/team/schedule/_/name/{abbrev}",
                desc=f"NHL: {team['name']} vs {opponent}",
                source=f"sports_{team_key}",
            ))
    except Exception as e:
        logger.warning(f"    ESPN NHL {team['name']} error: {e}")

    return events


# ── MLS ────────────────────────────────────────────────────

def scrape_mls(team_key):
    """Scrape MLS schedule using ESPN scoreboard API (day-by-day).

    ESPN's MLS team schedule endpoint only returns past results.
    The scoreboard endpoint returns future fixtures for specific dates.
    We check every day in the 90-day window.
    """
    team = TEAMS[team_key]
    logger.info(f"    MLS: {team['name']}...")
    events = []

    espn_ids = {"nycfc": "17606", "redbulls": "190"}
    team_espn_id = espn_ids.get(team_key, "")
    if not team_espn_id:
        return events

    try:
        # Check each day in the range (ESPN MLS scoreboard is date-specific)
        checked = 0
        d = TODAY
        end = TODAY + timedelta(days=90)
        while d <= end:
            date_str = d.strftime("%Y%m%d")
            url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates={date_str}"
            try:
                resp = http_requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    for ev in data.get("events", []):
                        for comp in ev.get("competitions", []):
                            competitors = comp.get("competitors", [])
                            is_home = False
                            opponent = ""
                            for c in competitors:
                                tid = str(c.get("team", {}).get("id", ""))
                                if tid == team_espn_id and c.get("homeAway") == "home":
                                    is_home = True
                                elif c.get("homeAway") == "away":
                                    opponent = c.get("team", {}).get("displayName", "TBD")

                            if is_home:
                                ev_date = ev.get("date", "")[:10]
                                time_str = None
                                if "T" in ev.get("date", ""):
                                    try:
                                        dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
                                        time_str = dt.strftime("%I:%M %p").lstrip("0")
                                    except:
                                        pass
                                events.append(make_event(
                                    title=f"{team['name']} vs {opponent}",
                                    date_str=ev_date,
                                    time_str=time_str,
                                    venue=team["venue"],
                                    hood=team["hood"],
                                    borough=team["borough"],
                                    url=f"https://www.mlssoccer.com/clubs/{'new-york-city-football-club' if team_key == 'nycfc' else 'red-bull-new-york'}/schedule",
                                    desc=f"MLS: {team['name']} vs {opponent}",
                                    source=f"sports_{team_key}",
                                ))
            except:
                pass

            checked += 1
            d += timedelta(days=1)
            # Rate limit: brief pause every 10 requests
            if checked % 10 == 0:
                time.sleep(0.5)

    except Exception as e:
        logger.warning(f"    MLS {team['name']} error: {e}")

    return events


# ── Main orchestrator ──────────────────────────────────────

def push_to_supabase(events):
    logger.info("  Pushing to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    created = errors = 0
    for ev in events:
        try:
            supabase.table("events").upsert({
                "title": ev["title"],
                "date": ev["date"],
                "time": ev.get("time"),
                "venue": ev["venue"],
                "neighborhood": ev.get("neighborhood"),
                "borough": ev.get("borough"),
                "category": "Sports",
                "is_free": False,
                "url": ev.get("url"),
                "description": ev.get("description"),
                "source": ev["source"],
            }, on_conflict="title,date,venue").execute()
            created += 1
        except:
            errors += 1

    logger.info(f"  Supabase: {created} upserted, {errors} errors")
    return {"upserted": created, "errors": errors}


def scrape_all_sports():
    logger.info("=== NYC SPORTS SCRAPER ===")

    all_events = []
    team_counts = {}

    # MLB
    for key in ["yankees", "mets"]:
        evts = scrape_mlb(key)
        team_counts[key] = len(evts)
        all_events.extend(evts)

    # NBA
    for key in ["knicks", "nets"]:
        evts = scrape_nba(key)
        team_counts[key] = len(evts)
        all_events.extend(evts)

    # NHL
    for key in ["rangers", "islanders"]:
        evts = scrape_nhl(key)
        team_counts[key] = len(evts)
        all_events.extend(evts)

    # WNBA
    evts = scrape_nba("liberty")
    team_counts["liberty"] = len(evts)
    all_events.extend(evts)

    # MLS
    for key in ["nycfc", "redbulls"]:
        evts = scrape_mls(key)
        team_counts[key] = len(evts)
        all_events.extend(evts)

    logger.info(f"\n  Total scraped: {len(all_events)}")
    for team, count in team_counts.items():
        logger.info(f"    {team}: {count}")

    result = push_to_supabase(all_events)
    result["scraped"] = len(all_events)
    result["teams"] = team_counts

    total = result.get("upserted", 0)
    logger.info(f"=== SPORTS COMPLETE: {total} events from {len(team_counts)} teams ===")
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    scrape_all_sports()
