import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
from datetime import datetime
import schedule
import time as time_module

# MongoDB Atlas setup
MONGO_URI = "mongodb+srv://manpatel240406:uTyOSGo7lVNuvA8t@vlrdata.9ltay4g.mongodb.net/?retryWrites=true&w=majority&appName=VlrData"  # Replace with your MongoDB Atlas URI
DB_NAME = "vlr_matches"
COLLECTION_NAME = "matches"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

URL = 'https://www.vlr.gg/event/matches/2500/vct-2025-pacific-stage-2/?series_id=4858'
HEADERS = {
    'User-Agent': 'Mozilla/5.0'
}


def fetch_matches():
    response = requests.get(URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')

    match_cards = soup.select('.match-item')
    print(f"[i] Found {len(match_cards)} matches")

    for card in match_cards:
        try:
            time_text = card.select_one(".match-item-time").text.strip()
            teams = card.select(".match-item-vs-team")
            scores = card.select(".match-item-vs-score span")
            event = card.select_one(".match-item-event").text.strip()
            match_url = 'https://www.vlr.gg' + card['href']

            team1 = teams[0].text.strip()
            team2 = teams[1].text.strip()

            # Check if match is finished or upcoming
            if scores and len(scores) == 2:
                score1 = scores[0].text.strip()
                score2 = scores[1].text.strip()
                status = "finished"
            else:
                score1 = score2 = None
                status = "upcoming"

            # Build document
            match_doc = {
                "start_time": time_text,
                "team1": team1,
                "team2": team2,
                "score1": score1,
                "score2": score2,
                "status": status,
                "event": event,
                "url": match_url,
                "fetched_at": datetime.utcnow()
            }

            # Upsert to avoid duplicates
            collection.update_one(
                {"url": match_doc["url"]},
                {"$set": match_doc},
                upsert=True
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
