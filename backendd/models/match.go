package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Match struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Team1     string             `bson:"team1" json:"team1"`
	Team2     string             `bson:"team2" json:"team2"`
	StartTime string             `bson:"start_time" json:"start_time"`
	Event     string             `bson:"event" json:"event"`
	Score     string             `bson:"score" json:"score"`
}
