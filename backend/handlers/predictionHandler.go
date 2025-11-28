package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	// "strings"
	"time"

	"backendd/config"
	"backendd/middleware"
	"backendd/models"
	// "backendd/utils"
	"sort"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	// "go.mongodb.org/mongo-driver/mongo"
)

// Enable CORS for prediction endpoints
func enableCORSPrediction(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}

// CreatePrediction handles creating a new prediction
func CreatePrediction(w http.ResponseWriter, r *http.Request) {
	enableCORSPrediction(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get user from context
	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"message":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req models.CreatePredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"message":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate input
	if req.MatchID == "" || req.PredictedScore1 == "" || req.PredictedScore2 == "" {
		http.Error(w, `{"message":"Match ID and predicted scores are required"}`, http.StatusBadRequest)
		return
	}

	// Get match to check if it's valid and not started
	matchCollection := config.DB.Collection(config.GetCollectionName())
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	matchID, err := primitive.ObjectIDFromHex(req.MatchID)
	if err != nil {
		http.Error(w, `{"message":"Invalid match ID"}`, http.StatusBadRequest)
		return
	}

	var match models.Match
	err = matchCollection.FindOne(ctx, bson.M{"_id": matchID}).Decode(&match)
	if err != nil {
		http.Error(w, `{"message":"Match not found"}`, http.StatusNotFound)
		return
	}

	// Check if match has already started (1 hour before start time)
	if !canPredictMatch(match.StartTime) {
		http.Error(w, `{"message":"Predictions are locked. You can only predict 1 hour before match start"}`, http.StatusBadRequest)
		return
	}

	// Check if match is already completed
	if match.Status == "completed" || match.Status == "finished" {
		http.Error(w, `{"message":"Cannot predict on completed matches"}`, http.StatusBadRequest)
		return
	}

	// Check if user already has a prediction for this match
	predictionCollection := config.DB.Collection("predictions")
	var existingPrediction models.Prediction
	err = predictionCollection.FindOne(ctx, bson.M{
		"user_id":  claims.UserID,
		"match_id": req.MatchID,
	}).Decode(&existingPrediction)

	if err == nil {
		// Update existing prediction
		update := bson.M{
			"$set": bson.M{
				"predicted_score1": req.PredictedScore1,
				"predicted_score2": req.PredictedScore2,
				"updated_at":       time.Now(),
			},
		}
		_, err = predictionCollection.UpdateOne(ctx, bson.M{"_id": existingPrediction.ID}, update)
		if err != nil {
			http.Error(w, `{"message":"Error updating prediction"}`, http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{"message": "Prediction updated successfully"})
		return
	}

	// Create new prediction
	prediction := models.Prediction{
		UserID:          claims.UserID,
		MatchID:         req.MatchID,
		PredictedScore1: req.PredictedScore1,
		PredictedScore2: req.PredictedScore2,
		Points:          0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	result, err := predictionCollection.InsertOne(ctx, prediction)
	if err != nil {
		http.Error(w, `{"message":"Error creating prediction"}`, http.StatusInternalServerError)
		return
	}

	prediction.ID = result.InsertedID.(primitive.ObjectID)
	json.NewEncoder(w).Encode(prediction)
}

// GetUserPredictions gets all predictions for the authenticated user
func GetUserPredictions(w http.ResponseWriter, r *http.Request) {
	enableCORSPrediction(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"message":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	collection := config.DB.Collection("predictions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{"user_id": claims.UserID})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var predictions []models.Prediction
	if err = cursor.All(ctx, &predictions); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(predictions)
}

// GetUserScore calculates and returns the total score for the authenticated user
func GetUserScore(w http.ResponseWriter, r *http.Request) {
	enableCORSPrediction(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	claims := middleware.GetUserFromContext(r)
	if claims == nil {
		http.Error(w, `{"message":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	collection := config.DB.Collection("predictions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Aggregate to sum all points
	pipeline := []bson.M{
		{"$match": bson.M{"user_id": claims.UserID}},
		{"$group": bson.M{
			"_id":   nil,
			"score": bson.M{"$sum": "$points"},
		}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err = cursor.All(ctx, &result); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	score := 0
	if len(result) > 0 {
		if s, ok := result[0]["score"].(int32); ok {
			score = int(s)
		} else if s, ok := result[0]["score"].(int64); ok {
			score = int(s)
		} else if s, ok := result[0]["score"].(int); ok {
			score = s
		}
	}

	json.NewEncoder(w).Encode(models.UserScore{
		UserID: claims.UserID,
		Score:  score,
	})
}

// UpdatePredictionScores updates prediction scores when matches are completed
// This should be called by a background job or admin endpoint
func UpdatePredictionScores(w http.ResponseWriter, r *http.Request) {
	enableCORSPrediction(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	matchCollection := config.DB.Collection(config.GetCollectionName())
	predictionCollection := config.DB.Collection("predictions")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get all completed matches
	cursor, err := matchCollection.Find(ctx, bson.M{
		"status": bson.M{"$in": []string{"completed", "finished"}},
	})
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

	updated := 0
	for _, match := range matches {
		// Get all predictions for this match
		predCursor, err := predictionCollection.Find(ctx, bson.M{
			"match_id":      match.ID.Hex(),
			"actual_score1": bson.M{"$exists": false}, // Only update if not already updated
		})
		if err != nil {
			continue
		}

		var predictions []models.Prediction
		predCursor.All(ctx, &predictions)
		predCursor.Close(ctx)

		for _, pred := range predictions {
			// Calculate if prediction is correct
			predScore1, _ := strconv.Atoi(pred.PredictedScore1)
			predScore2, _ := strconv.Atoi(pred.PredictedScore2)
			actualScore1, _ := strconv.Atoi(match.Score1)
			actualScore2, _ := strconv.Atoi(match.Score2)

			isCorrect := (predScore1 == actualScore1 && predScore2 == actualScore2)
			points := 0
			if isCorrect {
				points = 10
			} else {
				points = -5
			}

			// Update prediction
			update := bson.M{
				"$set": bson.M{
					"actual_score1": match.Score1,
					"actual_score2": match.Score2,
					"points":        points,
					"is_correct":    isCorrect,
					"updated_at":    time.Now(),
				},
			}
			predictionCollection.UpdateOne(ctx, bson.M{"_id": pred.ID}, update)
			updated++
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Predictions updated",
		"updated": updated,
	})
}

// Helper function to check if match can be predicted (1 hour before start)
func canPredictMatch(startTimeStr string) bool {
	if startTimeStr == "" {
		// If no time provided, allow prediction
		return true
	}

	// Parse the start time string
	// Format might be like "1:30 PM" or "2025-01-15 1:30 PM"
	layouts := []string{
		"3:04 PM",
		"03:04 PM",
		"1/2/2006 3:04 PM",
		"2006-01-02 3:04 PM",
		"2006-01-02T15:04:05Z07:00",
		time.RFC3339,
		time.RFC3339Nano,
	}

	var matchTime time.Time
	var err error
	for _, layout := range layouts {
		matchTime, err = time.Parse(layout, startTimeStr)
		if err == nil {
			break
		}
	}

	if err != nil {
		// If we can't parse, try to parse as relative time or assume it's valid (allow prediction)
		// This handles cases where time format is unexpected
		return true
	}

	// If parsed time is in the past, match has already started
	if matchTime.Before(time.Now()) {
		return false
	}

	// Check if current time is at least 1 hour before match time
	oneHourBefore := matchTime.Add(-1 * time.Hour)
	return time.Now().Before(oneHourBefore)
}

// GetLeaderboard returns the leaderboard with all users and their scores
func GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	enableCORSPrediction(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	userCollection := config.DB.Collection("users")
	predictionCollection := config.DB.Collection("predictions")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get all users
	userCursor, err := userCollection.Find(ctx, bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer userCursor.Close(ctx)

	var users []models.User
	if err = userCursor.All(ctx, &users); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate score for each user
	leaderboard := []models.LeaderboardEntry{}
	for _, user := range users {
		// Aggregate to sum all points for this user
		pipeline := []bson.M{
			{"$match": bson.M{"user_id": user.ID.Hex()}},
			{"$group": bson.M{
				"_id":   nil,
				"score": bson.M{"$sum": "$points"},
			}},
		}

		cursor, err := predictionCollection.Aggregate(ctx, pipeline)
		if err != nil {
			// If user has no predictions, score is 0
			leaderboard = append(leaderboard, models.LeaderboardEntry{
				UserID:   user.ID.Hex(),
				Username: user.Username,
				Score:    0,
			})
			continue
		}

		var result []bson.M
		cursor.All(ctx, &result)
		cursor.Close(ctx)

		score := 0
		if len(result) > 0 {
			if s, ok := result[0]["score"].(int32); ok {
				score = int(s)
			} else if s, ok := result[0]["score"].(int64); ok {
				score = int(s)
			} else if s, ok := result[0]["score"].(int); ok {
				score = s
			}
		}

		leaderboard = append(leaderboard, models.LeaderboardEntry{
			UserID:   user.ID.Hex(),
			Username: user.Username,
			Score:    score,
		})
	}

	// Sort by score (descending), then by username (ascending) for ties
	sort.Slice(leaderboard, func(i, j int) bool {
		if leaderboard[i].Score == leaderboard[j].Score {
			return leaderboard[i].Username < leaderboard[j].Username
		}
		return leaderboard[i].Score > leaderboard[j].Score
	})

	// Assign ranks
	for i := range leaderboard {
		leaderboard[i].Rank = i + 1
	}

	json.NewEncoder(w).Encode(leaderboard)
}

