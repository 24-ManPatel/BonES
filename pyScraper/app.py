import requests
from bs4 import BeautifulSoup
import datetime

BASE_URL = "https://vlr.gg"

def scrape_upcoming_matches():
    url = f"{BASE_URL}/matches"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("Failed to load vlr.gg")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    match_cards = soup.select("a.match-item")

    matches = []

    for card in match_cards:
        try:
            match_href = card["href"]
            full_url = BASE_URL + match_href

            team_names = card.select(".match-item-vs-team-name")
            if len(team_names) < 2:
                continue  # skip incomplete matches

            team1 = team_names[0].text.strip()
            team2 = team_names[1].text.strip()

            event = card.select_one(".match-item-event").text.strip()
            time = card.select_one(".match-item-time").text.strip()

            matches.append({
                "team1": team1,
                "team2": team2,
                "event": event,
                "time": time,
                "url": full_url
            })
        except Exception as e:
            print("Error parsing match card:", e)

    return matches

def save_matches_to_txt(matches):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    output = f"\n\n--- Scrape at {now} ---\n\n"

    for m in matches:
        output += f"{m['team1']} vs {m['team2']}\n"
        output += f"Event: {m['event']}\n"
        output += f"Time: {m['time']}\n"
        output += f"Match Page: {m['url']}\n"
        output += "-" * 40 + "\n"

    with open("matches.txt", "a", encoding="utf-8") as f:
        f.write(output)

    print(f"[✓] {len(matches)} matches saved to matches.txt")

if __name__ == "__main__":
    matches = scrape_upcoming_matches()
    save_matches_to_txt(matches)
