package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"backendd/config"
	"backendd/models"

	"go.mongodb.org/mongo-driver/bson"
)

func GetMatches(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	collection := config.DB.Collection(os.Getenv("COLLECTION_NAME"))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Calculate date range: last 5 days to next 5 days from current date
	now := time.Now()
	// Set to start of day for accurate comparison
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	fiveDaysAgo := startOfToday.AddDate(0, 0, -5)
	fiveDaysAhead := startOfToday.AddDate(0, 0, 6) // Include the full 5th day ahead

	// Filter for Valorant Game Changers matches
	// We'll filter by fetched_at to ensure we have recent data, then filter by start_time
	filter := bson.M{
		"event": bson.M{
			"$regex":   "Game Changers",
			"$options": "i",
		},
		// Only include matches that were fetched recently (within last 30 days)
		// This ensures we're working with fresh data
		"fetched_at": bson.M{
			"$gte": now.AddDate(0, 0, -30),
		},
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

	// Filter matches based on start_time (match schedule) within last 5 days to next 5 days
	filteredMatches := []models.Match{}
	for _, match := range matches {
		matchTime := parseMatchTime(match.StartTime)
		if matchTime != nil {
			// Normalize match time to start of day for comparison
			matchDate := time.Date(matchTime.Year(), matchTime.Month(), matchTime.Day(), 0, 0, 0, 0, matchTime.Location())
			
			// Check if match date is within the range (last 5 days to next 5 days)
			if (matchDate.After(fiveDaysAgo) || matchDate.Equal(fiveDaysAgo)) && 
			   (matchDate.Before(fiveDaysAhead) || matchDate.Equal(fiveDaysAhead)) {
				filteredMatches = append(filteredMatches, match)
			}
		} else {
			// If we can't parse start_time, use fetched_at as fallback
			// Only include if fetched within the date range
			if !match.FetchedAt.IsZero() {
				fetchDate := time.Date(match.FetchedAt.Year(), match.FetchedAt.Month(), match.FetchedAt.Day(), 0, 0, 0, 0, match.FetchedAt.Location())
				if (fetchDate.After(fiveDaysAgo) || fetchDate.Equal(fiveDaysAgo)) && 
				   (fetchDate.Before(fiveDaysAhead) || fetchDate.Equal(fiveDaysAhead)) {
					filteredMatches = append(filteredMatches, match)
				}
			}
		}
	}

	json.NewEncoder(w).Encode(filteredMatches)
}

// Helper function to parse match time string
func parseMatchTime(timeStr string) *time.Time {
	if timeStr == "" {
		return nil
	}

	// Try common time formats
	layouts := []string{
		"3:04 PM",
		"03:04 PM",
		"1/2/2006 3:04 PM",
		"2006-01-02 3:04 PM",
		"2006-01-02T15:04:05Z07:00",
		time.RFC3339,
		time.RFC3339Nano,
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, timeStr); err == nil {
			return &t
		}
	}

	// Try parsing as ISO date
	if t, err := time.Parse(time.RFC3339, timeStr); err == nil {
		return &t
	}

	return nil
}
