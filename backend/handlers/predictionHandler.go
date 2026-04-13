package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"backendd/config"
	"backendd/middleware"
	"backendd/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func enableCORSPrediction(w http.ResponseWriter) { config.SetCORSHeaders(w) }

// CreatePrediction handles creating or updating a prediction.
// Users pick the winning team (+10 pts) and optionally the series score (+5 bonus).
func CreatePrediction(w http.ResponseWriter, r *http.Request) {
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

	var req models.CreatePredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"message":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.MatchID == "" || req.PredictedWinner == "" {
		http.Error(w, `{"message":"match_id and predicted_winner are required"}`, http.StatusBadRequest)
		return
	}

	matchCollection := config.DB.Collection(config.GetCollectionName())
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	matchID, err := primitive.ObjectIDFromHex(req.MatchID)
	if err != nil {
		http.Error(w, `{"message":"Invalid match ID"}`, http.StatusBadRequest)
		return
	}

	var match models.Match
	if err = matchCollection.FindOne(ctx, bson.M{"_id": matchID}).Decode(&match); err != nil {
		http.Error(w, `{"message":"Match not found"}`, http.StatusNotFound)
		return
	}

	// Validate predicted winner is one of the two teams
	if req.PredictedWinner != match.Team1 && req.PredictedWinner != match.Team2 {
		http.Error(w, `{"message":"predicted_winner must be one of the two teams"}`, http.StatusBadRequest)
		return
	}

	if match.Status == "completed" || match.Status == "finished" {
		http.Error(w, `{"message":"Cannot predict on completed matches"}`, http.StatusBadRequest)
		return
	}

	if !canPredictMatch(match.StartTime) {
		http.Error(w, `{"message":"Predictions locked 1 hour before match start"}`, http.StatusBadRequest)
		return
	}

	predictionCollection := config.DB.Collection("predictions")

	filter := bson.M{"user_id": claims.UserID, "match_id": req.MatchID}
	if req.LobbyID != "" {
		filter["lobby_id"] = req.LobbyID
	} else {
		filter["lobby_id"] = bson.M{"$exists": false}
	}

	var existing models.Prediction
	err = predictionCollection.FindOne(ctx, filter).Decode(&existing)

	if err == nil {
		// Update existing
		update := bson.M{"$set": bson.M{
			"predicted_winner": req.PredictedWinner,
			"predicted_score1": req.PredictedScore1,
			"predicted_score2": req.PredictedScore2,
			"updated_at":       time.Now(),
		}}
		if _, err = predictionCollection.UpdateOne(ctx, bson.M{"_id": existing.ID}, update); err != nil {
			http.Error(w, `{"message":"Error updating prediction"}`, http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"message": "Prediction updated"})
		return
	}

	prediction := models.Prediction{
		UserID:          claims.UserID,
		MatchID:         req.MatchID,
		LobbyID:         req.LobbyID,
		PredictedWinner: req.PredictedWinner,
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

	pipeline := []bson.M{
		{"$match": bson.M{"user_id": claims.UserID}},
		{"$group": bson.M{
			"_id":     nil,
			"score":   bson.M{"$sum": "$points"},
			"correct": bson.M{"$sum": bson.M{"$cond": []interface{}{"$winner_correct", 1, 0}}},
			"total":   bson.M{"$sum": bson.M{"$cond": []interface{}{"$is_evaluated", 1, 0}}},
		}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var result []bson.M
	cursor.All(ctx, &result)

	score := 0
	if len(result) > 0 {
		score = extractInt(result[0]["score"])
	}

	json.NewEncoder(w).Encode(models.UserScore{
		UserID: claims.UserID,
		Score:  score,
	})
}

// UpdatePredictionScores evaluates all un-scored predictions for completed matches.
// Protected by ADMIN_SECRET header — set X-Admin-Secret: <value from .env>.
// Point system:
//   - +10 for correct winner
//   - +5 bonus if exact series score also correct (e.g. picked 2-1 and result was 2-1)
//   - 0 for wrong winner (no negative points)
//
// Should be called periodically (cron) or after each match completes.
func UpdatePredictionScores(w http.ResponseWriter, r *http.Request) {
	enableCORSPrediction(w)
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Verify admin secret
	secret := os.Getenv("ADMIN_SECRET")
	if secret == "" || r.Header.Get("X-Admin-Secret") != secret {
		http.Error(w, `{"message":"Forbidden"}`, http.StatusForbidden)
		return
	}

	matchCollection := config.DB.Collection(config.GetCollectionName())
	predictionCollection := config.DB.Collection("predictions")
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
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
	cursor.All(ctx, &matches)

	updated := 0
	for _, match := range matches {
		// Only process if the match has valid scores
		score1, err1 := strconv.Atoi(match.Score1)
		score2, err2 := strconv.Atoi(match.Score2)
		if err1 != nil || err2 != nil {
			continue
		}

		actualWinner := match.Team1
		if score2 > score1 {
			actualWinner = match.Team2
		}

		// Get un-evaluated predictions for this match
		predCursor, err := predictionCollection.Find(ctx, bson.M{
			"match_id":     match.ID.Hex(),
			"is_evaluated": bson.M{"$ne": true},
		})
		if err != nil {
			continue
		}

		var predictions []models.Prediction
		predCursor.All(ctx, &predictions)
		predCursor.Close(ctx)

		for _, pred := range predictions {
			winnerCorrect := pred.PredictedWinner == actualWinner
			winnerPoints := 0
			if winnerCorrect {
				winnerPoints = 10
			}

			// Bonus: exact series score
			scoreCorrect := false
			bonusPoints := 0
			if pred.PredictedScore1 != "" && pred.PredictedScore2 != "" {
				ps1, e1 := strconv.Atoi(pred.PredictedScore1)
				ps2, e2 := strconv.Atoi(pred.PredictedScore2)
				if e1 == nil && e2 == nil {
					scoreCorrect = (ps1 == score1 && ps2 == score2)
					if scoreCorrect {
						bonusPoints = 5
					}
				}
			}

			totalPoints := winnerPoints + bonusPoints

			update := bson.M{"$set": bson.M{
				"actual_winner":  actualWinner,
				"actual_score1":  match.Score1,
				"actual_score2":  match.Score2,
				"winner_points":  winnerPoints,
				"bonus_points":   bonusPoints,
				"points":         totalPoints,
				"winner_correct": winnerCorrect,
				"score_correct":  scoreCorrect,
				"is_evaluated":   true,
				"updated_at":     time.Now(),
			}}
			predictionCollection.UpdateOne(ctx, bson.M{"_id": pred.ID}, update)
			updated++
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Prediction scores updated",
		"updated": updated,
	})
}

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

	var users []models.User
	userCursor, err := userCollection.Find(ctx, bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer userCursor.Close(ctx)
	userCursor.All(ctx, &users)

	leaderboard := []models.LeaderboardEntry{}
	for _, user := range users {
		pipeline := []bson.M{
			{"$match": bson.M{"user_id": user.ID.Hex()}},
			{"$group": bson.M{
				"_id":     nil,
				"score":   bson.M{"$sum": "$points"},
				"correct": bson.M{"$sum": bson.M{"$cond": []interface{}{"$winner_correct", 1, 0}}},
				"total":   bson.M{"$sum": bson.M{"$cond": []interface{}{"$is_evaluated", 1, 0}}},
			}},
		}

		cursor, err := predictionCollection.Aggregate(ctx, pipeline)
		if err != nil {
			leaderboard = append(leaderboard, models.LeaderboardEntry{
				UserID: user.ID.Hex(), Username: user.Username,
			})
			continue
		}

		var result []bson.M
		cursor.All(ctx, &result)
		cursor.Close(ctx)

		entry := models.LeaderboardEntry{
			UserID:   user.ID.Hex(),
			Username: user.Username,
		}
		if len(result) > 0 {
			entry.Score = extractInt(result[0]["score"])
			entry.Correct = extractInt(result[0]["correct"])
			entry.Total = extractInt(result[0]["total"])
		}
		leaderboard = append(leaderboard, entry)
	}

	sort.Slice(leaderboard, func(i, j int) bool {
		if leaderboard[i].Score == leaderboard[j].Score {
			return leaderboard[i].Username < leaderboard[j].Username
		}
		return leaderboard[i].Score > leaderboard[j].Score
	})

	for i := range leaderboard {
		leaderboard[i].Rank = i + 1
	}

	json.NewEncoder(w).Encode(leaderboard)
}

// canPredictMatch returns true if it's still more than 1 hour before match start.
func canPredictMatch(startTimeStr string) bool {
	if startTimeStr == "" {
		return true
	}

	layouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02 3:04 PM",
		"1/2/2006 3:04 PM",
		"3:04 PM",
		"03:04 PM",
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
		return true // can't parse = don't block predictions
	}

	if matchTime.Before(time.Now()) {
		return false
	}

	return time.Now().Before(matchTime.Add(-1 * time.Hour))
}

// extractInt safely reads an int from a bson.M value (handles int32/int64/int).
func extractInt(v interface{}) int {
	switch s := v.(type) {
	case int32:
		return int(s)
	case int64:
		return int(s)
	case int:
		return s
	}
	return 0
}
