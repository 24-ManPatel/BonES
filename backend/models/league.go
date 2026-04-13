package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// League represents an official VCT competition.
// Only official events are supported: Champions Tour, Masters, and regional Splits.
type League struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`         // e.g. "VCT 2025: Champions Tour - EMEA Stage 1"
	ShortName string             `bson:"short_name" json:"short_name"` // e.g. "EMEA Stage 1"
	VLRUrl    string             `bson:"vlr_url" json:"vlr_url"`   // VLR.gg event matches URL
	Region    string             `bson:"region" json:"region"`     // "EMEA", "Americas", "Pacific", "CN", "Global"
	Season    string             `bson:"season" json:"season"`     // "2025"
	Type      string             `bson:"type" json:"type"`         // "champions", "masters", "split"
	Status    string             `bson:"status" json:"status"`     // "upcoming", "active", "completed"
	StartDate time.Time          `bson:"start_date" json:"start_date"`
	EndDate   time.Time          `bson:"end_date" json:"end_date"`
	// Once a league is active, new users cannot join global fantasy for it
	EntryLocked bool      `bson:"entry_locked" json:"entry_locked"`
	CreatedAt   time.Time `bson:"created_at" json:"created_at"`
}
