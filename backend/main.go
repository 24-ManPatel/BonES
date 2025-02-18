package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/24-ManPatel/BONES/backend/scraper"


	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client

// Connects to MongoDB
func connectDB() {
	uri := "mongodb+srv://manpatel240406:fm8orVTuw8b6rAlZ@bones.mfrsc.mongodb.net/?retryWrites=true&w=majority&appName=BonES"
	clientOptions := options.Client().ApplyURI(uri)

	var err error
	client, err = mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}

	fmt.Println("✅ Connected to MongoDB!")
}

// Closes MongoDB connection
func closeDB() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Disconnect(ctx); err != nil {
		log.Fatal("Error closing MongoDB connection:", err)
	}

	fmt.Println("❌ Disconnected from MongoDB!")
}

func main() {
	// Connect to MongoDB
	connectDB()
	defer closeDB() // Ensure DB closes when the program exits

	// Run the scraper in the background
	go scraper.FetchUpcomingMatches()

	// HTTP Server Handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("🔥 Server is running with MongoDB & Scraper!"))
	})

	fmt.Println("🚀 Starting server on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
