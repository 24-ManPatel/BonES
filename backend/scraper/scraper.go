package scraper

import (
	"fmt"
	"log"
	"strings"

	"github.com/gocolly/colly/v2"
)

// MatchData structure to store match details
type MatchData struct {
	Event     string
	Team1     string
	Team2     string
	MatchTime string
}

// FetchUpcomingMatches scrapes upcoming Valorant Masters Bangkok matches
func FetchUpcomingMatches() {
	c := colly.NewCollector(
		colly.AllowedDomains("liquipedia.net"),
	)

	// Set User-Agent to avoid being blocked
	c.OnRequest(func(r *colly.Request) {
		r.Headers.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		fmt.Println("Visiting:", r.URL.String())
	})

	// Scrape match details
	c.OnHTML(".infobox_matches_content", func(e *colly.HTMLElement) {
		event := e.ChildText(".league-icon")           // Tournament Name
		teams := e.ChildTexts(".team-template-text a") // Teams
		matchTime := e.ChildText(".timer-object")      // Match Time

		// Ensure valid data is scraped
		if len(teams) >= 2 && matchTime != "" {
			match := MatchData{
				Event:     strings.TrimSpace(event),
				Team1:     strings.TrimSpace(teams[0]),
				Team2:     strings.TrimSpace(teams[1]),
				MatchTime: strings.TrimSpace(matchTime),
			}

			// Print match details
			fmt.Printf("📅 Match: %s vs %s\n🕒 Time: %s\n🏆 Event: %s\n\n", match.Team1, match.Team2, match.MatchTime, match.Event)
		}
	})

	// Handle errors
	c.OnError(func(r *colly.Response, err error) {
		log.Println("Request failed:", r.Request.URL, "Status:", r.StatusCode, "Error:", err)
	})

	// Visit Liquipedia Valorant Masters Bangkok page
	err := c.Visit("https://liquipedia.net/valorant/VALORANT_Champions_Tour/2024/Masters/Bangkok")
	if err != nil {
		log.Fatal("Error visiting page:", err)
	}

	c.Wait() // Wait for all requests to finish
}
