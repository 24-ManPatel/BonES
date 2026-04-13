package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"backendd/config"
	"backendd/models"

	"go.mongodb.org/mongo-driver/bson"
)

func GetMatches(w http.ResponseWriter, r *http.Request) {
	config.SetCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	collection := config.DB.Collection(os.Getenv("COLLECTION_NAME"))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Optional query params
	eventFilter := r.URL.Query().Get("event")   // filter by event name substring
	statusFilter := r.URL.Query().Get("status")  // "upcoming" | "finished" | "" = all

	filter := bson.M{
		// Only matches fetched within the last 30 days (fresh data)
		"fetched_at": bson.M{"$gte": time.Now().AddDate(0, 0, -30)},
	}

	// Apply event filter if given, otherwise show all VCT official events
	if eventFilter != "" {
		filter["event"] = bson.M{"$regex": eventFilter, "$options": "i"}
	} else {
		// Show all official VCT events by default (Champions Tour, Masters, splits)
		filter["event"] = bson.M{
			"$regex":   `VCT|Champions Tour|Masters|Game Changers|LOCK//IN|VALORANT Champions`,
			"$options": "i",
		}
	}

	if statusFilter != "" {
		if statusFilter == "finished" {
			filter["status"] = bson.M{"$in": []string{"finished", "completed"}}
		} else {
			filter["status"] = statusFilter
		}
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var matches []models.Match
	if err = cursor.All(ctx, &matches); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Date-window filter: -5 to +14 days from today
	now := time.Now()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	windowStart := startOfToday.AddDate(0, 0, -5)
	windowEnd := startOfToday.AddDate(0, 0, 15)

	filtered := []models.Match{}
	for _, match := range matches {
		matchTime := parseMatchTime(match.StartTime)
		if matchTime != nil {
			matchDate := time.Date(matchTime.Year(), matchTime.Month(), matchTime.Day(), 0, 0, 0, 0, matchTime.Location())
			if !matchDate.Before(windowStart) && matchDate.Before(windowEnd) {
				filtered = append(filtered, match)
			}
		} else if !match.FetchedAt.IsZero() {
			fetchDate := time.Date(match.FetchedAt.Year(), match.FetchedAt.Month(), match.FetchedAt.Day(), 0, 0, 0, 0, match.FetchedAt.Location())
			if !fetchDate.Before(windowStart) && fetchDate.Before(windowEnd) {
				filtered = append(filtered, match)
			}
		}
	}

	json.NewEncoder(w).Encode(filtered)
}

// parseMatchTime tries to parse various time string formats stored by the scraper.
func parseMatchTime(timeStr string) *time.Time {
	if timeStr == "" {
		return nil
	}

	// Prioritise ISO formats (used by updated scraper)
	isoLayouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
	}
	for _, layout := range isoLayouts {
		if t, err := time.Parse(layout, timeStr); err == nil {
			return &t
		}
	}

	// Legacy: time-only strings scraped before date was captured
	// (These can't be date-filtered reliably – treat them as today)
	legacyLayouts := []string{"3:04 PM", "03:04 PM", "1/2/2006 3:04 PM", "2006-01-02 3:04 PM"}
	now := time.Now()
	for _, layout := range legacyLayouts {
		if t, err := time.Parse(layout, timeStr); err == nil {
			// Anchor to today so they still appear in the window
			today := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location())
			return &today
		}
	}

	// Try trimming and re-parsing in case of extra whitespace
	trimmed := strings.TrimSpace(timeStr)
	if trimmed != timeStr {
		return parseMatchTime(trimmed)
	}

	return nil
}
