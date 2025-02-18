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

// FetchUpcomingMatches scrapes upcoming Valorant Masters Bangkok matches from VLR.gg
func FetchUpcomingMatches() {
	c := colly.NewCollector(
		colly.AllowedDomains("vlr.gg"),
	)

	// Set User-Agent to avoid being blocked
	c.OnRequest(func(r *colly.Request) {
		r.Headers.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		fmt.Println("Visiting:", r.URL.String())
	})

	// Scrape match details
	c.OnHTML(".match-item", func(e *colly.HTMLElement) {
		// Extract event name
		event := e.ChildText(".match-item-event")
		
		// Extract team names
		team1 := e.ChildText(".match-item-vs-team-1 .match-item-vs-team-name")
		team2 := e.ChildText(".match-item-vs-team-2 .match-item-vs-team-name")
		
		// Extract match time
		matchTime := e.ChildText(".match-item-time")

		// Clean up the data
		event = strings.TrimSpace(event)
		team1 = strings.TrimSpace(team1)
		team2 = strings.TrimSpace(team2)
		matchTime = strings.TrimSpace(matchTime)

		// Ensure valid data is scraped
		if team1 != "" && team2 != "" && matchTime != "" {
			match := MatchData{
				Event:     event,
				Team1:     team1,
				Team2:     team2,
				MatchTime: matchTime,
			}

			// Print match details
			fmt.Printf("Match: %s vs %s\nTime: %s\nEvent: %s\n\n", 
				match.Team1, 
				match.Team2, 
				match.MatchTime, 
				match.Event,
			)
		}
	})

	// Handle errors
	c.OnError(func(r *colly.Response, err error) {
		log.Println("Request failed:", r.Request.URL, "Status:", r.StatusCode, "Error:", err)
	})

	// Visit VLR.gg Masters Bangkok page
	err := c.Visit("https://www.vlr.gg/event/1947/vct-2024-masters-madrid")
	if err != nil {
		log.Fatal("Error visiting page:", err)
	}

	c.Wait() // Wait for all requests to finish
}