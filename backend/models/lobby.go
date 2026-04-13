package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Lobby is a private or public fantasy room tied to a specific league.
// Friends (or random players) join via invite code and compete against each other.
// Entry is locked once the league's first match starts.
type Lobby struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name     string             `bson:"name" json:"name"`
	Code     string             `bson:"code" json:"code"`         // 6-char alphanumeric invite code
	LeagueID string             `bson:"league_id" json:"league_id"`
	OwnerID  string             `bson:"owner_id" json:"owner_id"`
	Members  []string           `bson:"members" json:"members"`   // user IDs
	IsPublic bool               `bson:"is_public" json:"is_public"`
	// Entry lock: set to true when the league's first match starts
	// After this point no new members can join
	EntryLocked bool      `bson:"entry_locked" json:"entry_locked"`
	MaxMembers  int       `bson:"max_members" json:"max_members"` // 0 = unlimited
	CreatedAt   time.Time `bson:"created_at" json:"created_at"`
}

type CreateLobbyRequest struct {
	Name      string `json:"name" validate:"required,min=3,max=50"`
	LeagueID  string `json:"league_id" validate:"required"`
	IsPublic  bool   `json:"is_public"`
	MaxMembers int   `json:"max_members"`
}

type JoinLobbyRequest struct {
	Code string `json:"code" validate:"required"`
}

type LobbyLeaderboardEntry struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Score    int    `json:"score"`
	Rank     int    `json:"rank"`
	Correct  int    `json:"correct"`
	Total    int    `json:"total"`
}
