"""
BonES VLR.gg Scraper
====================
Scrapes official VCT match data from VLR.gg for:
  - Champions Tour (EMEA, Americas, Pacific, CN)
  - Masters
  - VALORANT Champions
  - Game Changers

Run manually:    python app.py
Schedule mode:   python app.py --schedule   (runs every 2 hours in a loop)
Docker/hosting:  set SCRAPE_ON_START=true and RUN_SCHEDULER=true env vars

Add new leagues by adding entries to VCT_LEAGUES below.
"""

import re
import sys
import time as time_module
import argparse
import schedule

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
from datetime import datetime, timezone
from os import getenv
from pathlib import Path
from dotenv import load_dotenv

# ── env setup ──────────────────────────────────────────────────────────────────
cwd = Path().resolve()
env_path = cwd.parent / ".env"
load_dotenv(env_path)

MONGO_URI       = getenv("MONGO_URI")
DB_NAME         = getenv("DB_NAME")
COLLECTION_NAME = getenv("COLLECTION_NAME")

client     = MongoClient(MONGO_URI)
db         = client[DB_NAME]
collection = db[COLLECTION_NAME]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; BonES-Scraper/1.0)"}

# ── Official VCT leagues to scrape ─────────────────────────────────────────────
# Format: (display_name, vlr_event_url)
# Update URLs each season. series_id=all fetches all stages of that event.
VCT_LEAGUES = [
    # ── 2025 Season ──
    ("VCT 2025: EMEA Stage 1",
     "https://www.vlr.gg/event/matches/2276/valorant-champions-tour-2025-emea-stage-1/?series_id=all"),

    ("VCT 2025: Americas Stage 1",
     "https://www.vlr.gg/event/matches/2275/valorant-champions-tour-2025-americas-stage-1/?series_id=all"),

    ("VCT 2025: Pacific Stage 1",
     "https://www.vlr.gg/event/matches/2274/valorant-champions-tour-2025-pacific-stage-1/?series_id=all"),

    ("VCT 2025: CN Stage 1",
     "https://www.vlr.gg/event/matches/2278/valorant-champions-tour-2025-cn-stage-1/?series_id=all"),

    ("VCT 2025: Masters Bangkok",
     "https://www.vlr.gg/event/matches/2279/valorant-champions-tour-2025-masters-bangkok/?series_id=all"),

    ("VCT 2025: Game Changers Championship Seoul",
     "https://www.vlr.gg/event/matches/2596/game-changers-2025-championship-seoul/?series_id=all"),

    # Add more as they're announced:
    # ("VALORANT Champions 2025",
    #  "https://www.vlr.gg/event/matches/XXXX/valorant-champions-2025/?series_id=all"),
]


# ── helpers ────────────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_vlr_date(date_str: str, year: int) -> datetime | None:
    """
    Parse date strings found in VLR.gg section headers.
    Common formats:  "Saturday, January 18"  /  "Sun, Jan 19"
    """
    date_str = clean(date_str)
    fmts = [
        "%A, %B %d",   # Saturday, January 18
        "%a, %b %d",   # Sat, Jan 18
        "%B %d",       # January 18
        "%b %d",       # Jan 18
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(year=year)
        except ValueError:
            continue
    return None


def parse_match_time(time_str: str, match_date: datetime | None) -> datetime | None:
    """
    Combine a time string like "9:00 AM" with a match_date to get a full datetime.
    Returns UTC datetime.
    """
    time_str = clean(time_str)
    fmts = ["%I:%M %p", "%I:%M%p", "%H:%M"]
    for fmt in fmts:
        try:
            t = datetime.strptime(time_str, fmt)
            if match_date:
                combined = match_date.replace(
                    hour=t.hour, minute=t.minute, second=0, microsecond=0
                )
                # VLR.gg displays times in UTC; store as UTC ISO string
                return combined.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


# ── scraper ────────────────────────────────────────────────────────────────────

def fetch_league(league_name: str, url: str) -> int:
    """Fetch and upsert all matches for a single league URL. Returns count saved."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"  [!] Failed to fetch {league_name}: {e}")
        return 0

    soup = BeautifulSoup(response.text, "html.parser")
    saved = 0
    current_date = None
    current_year = datetime.utcnow().year

    # VLR.gg groups matches under date headers then lists .match-item cards.
    # We walk all children of the matches container to capture date context.
    container = soup.select_one(".col.mod-1") or soup.select_one(".wf-card")

    # Walk every element looking for date headers and match cards
    for el in soup.find_all(True):
        # Date section headers look like:  <div class="wf-label mod-large">Saturday, January 18</div>
        if "wf-label" in el.get("class", []) or "matches-list-date" in el.get("class", []):
            parsed = parse_vlr_date(el.get_text(), current_year)
            if parsed:
                current_date = parsed

        if "match-item" not in el.get("class", []):
            continue
        if el.name != "a":
            continue

        try:
            time_text = clean(el.select_one(".match-item-time").get_text())
            teams     = el.select(".match-item-vs-team-name")
            event_el  = el.select_one(".match-item-event")

            if len(teams) < 2:
                continue

            team1_raw = clean(teams[0].get_text())
            team2_raw = clean(teams[1].get_text())
            event     = clean(event_el.get_text()) if event_el else league_name
            match_url = "https://www.vlr.gg" + el["href"]

            # Build full ISO start_time
            dt = parse_match_time(time_text, current_date)
            start_time_iso = dt.isoformat() if dt else time_text

            # Scores
            score_spans = el.select(".match-item-vs-team-score")
            if score_spans and len(score_spans) == 2:
                score1 = score_spans[0].get_text().strip()
                score2 = score_spans[1].get_text().strip()
                # Validate they're digits
                if not (score1.isdigit() and score2.isdigit()):
                    score1 = score2 = None
                    status = "upcoming"
                else:
                    status = "finished"
                    team1_raw = clean(re.sub(r"\s+\d+$", "", team1_raw))
                    team2_raw = clean(re.sub(r"\s+\d+$", "", team2_raw))
            else:
                # Some pages embed scores in the team name text
                sm1 = re.search(r"\b(\d+)$", team1_raw)
                sm2 = re.search(r"\b(\d+)$", team2_raw)
                if sm1 and sm2:
                    score1 = sm1.group(1)
                    score2 = sm2.group(1)
                    team1_raw = team1_raw[: sm1.start()].strip()
                    team2_raw = team2_raw[: sm2.start()].strip()
                    status = "finished"
                else:
                    score1 = score2 = None
                    status = "upcoming"

            doc = {
                "start_time": start_time_iso,
                "team1":      team1_raw,
                "team2":      team2_raw,
                "score1":     score1,
                "score2":     score2,
                "status":     status,
                "event":      event,
                "league":     league_name,
                "url":        match_url,
                "fetched_at": datetime.utcnow(),
            }

            collection.update_one({"url": match_url}, {"$set": doc}, upsert=True)
            saved += 1

        except Exception as e:
            print(f"  [!] Error parsing card: {e}")
            continue

    return saved


def fetch_all():
    print(f"\n[*] Starting scrape at {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    total = 0
    for name, url in VCT_LEAGUES:
        print(f"  → {name}")
        n = fetch_league(name, url)
        print(f"     saved/updated {n} matches")
        total += n
        time_module.sleep(1)  # be polite between requests
    print(f"[✓] Done. Total: {total} matches processed.\n")


# ── entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BonES VLR.gg scraper")
    parser.add_argument("--schedule", action="store_true",
                        help="Run on a schedule (every 2 hours) instead of once")
    args = parser.parse_args()

    # Always do an immediate fetch on start
    fetch_all()

    if args.schedule or getenv("RUN_SCHEDULER", "").lower() == "true":
        schedule.every(2).hours.do(fetch_all)
        print("[*] Scheduler active – fetching every 2 hours. Ctrl+C to stop.")
        while True:
            schedule.run_pending()
            time_module.sleep(60)
