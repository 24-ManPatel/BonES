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
	w.Header().Set("Content-Type", "application/json")

	collection := config.DB.Collection(os.Getenv("COLLECTION_NAME"))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{})
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

	json.NewEncoder(w).Encode(matches)
}
