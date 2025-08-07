import requests
from bs4 import BeautifulSoup

URL = 'https://www.vlr.gg/event/matches/2500/vct-2025-pacific-stage-2/?series_id=4858'
HEADERS = {
    'User-Agent': 'Mozilla/5.0'
}

def fetch_matches():
    response = requests.get(URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')

    match_cards = soup.select('.match-item')
    print(f"[i] Found {len(match_cards)} matches")

    matches = []
    for card in match_cards:
        try:
            time = card.select_one(".match-item-time").text.strip()
            teams = card.select(".match-item-vs-team")
            team1 = teams[0].text.strip()
            team2 = teams[1].text.strip()
            event = card.select_one(".match-item-event").text.strip()
            match_url = 'https://www.vlr.gg' + card['href']

            matches.append(f"{time} - {team1} vs {team2} | Event: {event} | URL: {match_url}")

        except Exception as e:
            print("Error parsing match card:", e)
            continue

    with open("matches.txt", "w", encoding="utf-8") as f:
        for match in matches:
            f.write(match + "\n")

    print(f"[✓] {len(matches)} matches saved to matches.txt")

if __name__ == "__main__":
    fetch_matches()
