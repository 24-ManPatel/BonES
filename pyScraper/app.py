import re
import requests
import schedule
import time as time_module

from bs4 import BeautifulSoup
from pymongo import MongoClient
from datetime import datetime
from os import getenv
from pathlib import Path
from dotenv import load_dotenv

cwd = Path().resolve()
parent_dir = cwd.parent
env_path = parent_dir / ".env"

load_dotenv(env_path)

# MongoDB Atlas setup
MONGO_URI = getenv("MONGO_URI")
DB_NAME = getenv("DB_NAME")
COLLECTION_NAME = getenv("COLLECTION_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

URL = "https://www.vlr.gg/event/matches/2500/vct-2025-pacific-stage-2/?series_id=4858"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def clean_text(text):
    # Remove tabs/newlines and collapse multiple spaces
    return re.sub(r"\s+", " ", text).strip()


def fetch_matches():
    response = requests.get(URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, "html.parser")

    match_cards = soup.select(".match-item")
    print(f"[i] Found {len(match_cards)} matches")

    for card in match_cards:
        try:
            time_text = clean_text(card.select_one(".match-item-time").text)
            teams = card.select(".match-item-vs-team")
            event = clean_text(card.select_one(".match-item-event").text)
            match_url = "https://www.vlr.gg" + card["href"]

            team1_raw = clean_text(teams[0].text)
            team2_raw = clean_text(teams[1].text)

            score_spans = card.select(".match-item-vs-score span")

            if score_spans and len(score_spans) == 2:
                score1 = score_spans[0].text.strip()
                score2 = score_spans[1].text.strip()
                team1 = team1_raw
                team2 = team2_raw
                status = "finished"
            else:
                score_match1 = re.search(r"\b(\d+)$", team1_raw)
                score_match2 = re.search(r"\b(\d+)$", team2_raw)

                if score_match1 and score_match2:
                    score1 = score_match1.group(1)
                    score2 = score_match2.group(1)
                    team1 = team1_raw[: score_match1.start()].strip()
                    team2 = team2_raw[: score_match2.start()].strip()
                    status = "finished"
                else:
                    score1 = score2 = None
                    team1 = team1_raw
                    team2 = team2_raw
                    status = "upcoming"

            match_doc = {
                "start_time": time_text,
                "team1": team1,
                "team2": team2,
                "score1": score1,
                "score2": score2,
                "status": status,
                "event": event,
                "url": match_url,
                "fetched_at": datetime.utcnow(),
            }

            collection.update_one(
                {"url": match_doc["url"]}, {"$set": match_doc}, upsert=True
            )

        except Exception as e:
            print("Error parsing match card:", e)
            continue

    print(f"[✓] Matches stored in MongoDB at {datetime.utcnow()}")


# Schedule every 2 hours
schedule.every(2).hours.do(fetch_matches)

if __name__ == "__main__":
    print("[*] Running initial fetch...")
    fetch_matches()

    print("[*] Starting scheduler (every 2 hours)...")
    while True:
        schedule.run_pending()
        time_module.sleep(60)
