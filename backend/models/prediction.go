package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Prediction stores a user's pick for a match.
// Primary mechanic: pick the winning team (+10 pts).
// Bonus: predict exact series score too (+5 pts bonus).
// No negative points – wrong picks just score 0.
type Prediction struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`

	UserID  string `bson:"user_id" json:"user_id"`
	MatchID string `bson:"match_id" json:"match_id"`
	LobbyID string `bson:"lobby_id,omitempty" json:"lobby_id,omitempty"` // empty = global leaderboard only

	// Core pick: which team wins
	PredictedWinner string `bson:"predicted_winner" json:"predicted_winner"`

	// Optional bonus: predicted series score (e.g. "2" - "1")
	PredictedScore1 string `bson:"predicted_score1,omitempty" json:"predicted_score1,omitempty"`
	PredictedScore2 string `bson:"predicted_score2,omitempty" json:"predicted_score2,omitempty"`

	// Filled in after match completes
	ActualWinner string `bson:"actual_winner,omitempty" json:"actual_winner,omitempty"`
	ActualScore1 string `bson:"actual_score1,omitempty" json:"actual_score1,omitempty"`
	ActualScore2 string `bson:"actual_score2,omitempty" json:"actual_score2,omitempty"`

	// Scoring breakdown
	WinnerPoints int  `bson:"winner_points" json:"winner_points"` // +10 correct winner, 0 wrong
	BonusPoints  int  `bson:"bonus_points" json:"bonus_points"`  // +5 exact series score, 0 otherwise
	Points       int  `bson:"points" json:"points"`              // total = winner_points + bonus_points
	IsEvaluated  bool `bson:"is_evaluated" json:"is_evaluated"`  // true once match result applied

	WinnerCorrect *bool `bson:"winner_correct,omitempty" json:"winner_correct,omitempty"`
	ScoreCorrect  *bool `bson:"score_correct,omitempty" json:"score_correct,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

type CreatePredictionRequest struct {
	MatchID         string `json:"match_id" validate:"required"`
	LobbyID         string `json:"lobby_id,omitempty"`
	PredictedWinner string `json:"predicted_winner" validate:"required"` // team name
	PredictedScore1 string `json:"predicted_score1,omitempty"`           // optional bonus
	PredictedScore2 string `json:"predicted_score2,omitempty"`           // optional bonus
}

type UserScore struct {
	UserID string `json:"user_id"`
	Score  int    `json:"score"`
}

type LeaderboardEntry struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Score    int    `json:"score"`
	Rank     int    `json:"rank"`
	Correct  int    `json:"correct"`  // number of correct winner picks
	Total    int    `json:"total"`    // total picks made
}
