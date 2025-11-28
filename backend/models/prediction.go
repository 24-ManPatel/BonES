package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Prediction struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID          string             `bson:"user_id" json:"user_id"`
	MatchID         string             `bson:"match_id" json:"match_id"`
	PredictedScore1 string             `bson:"predicted_score1" json:"predicted_score1"`
	PredictedScore2 string             `bson:"predicted_score2" json:"predicted_score2"`
	ActualScore1    string             `bson:"actual_score1,omitempty" json:"actual_score1,omitempty"`
	ActualScore2    string             `bson:"actual_score2,omitempty" json:"actual_score2,omitempty"`
	Points          int                `bson:"points" json:"points"` // +10 for correct, -5 for wrong, 0 for pending
	IsCorrect       *bool              `bson:"is_correct,omitempty" json:"is_correct,omitempty"`
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at" json:"updated_at"`
}

type CreatePredictionRequest struct {
	MatchID         string `json:"match_id" validate:"required"`
	PredictedScore1 string `json:"predicted_score1" validate:"required"`
	PredictedScore2 string `json:"predicted_score2" validate:"required"`
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
}

