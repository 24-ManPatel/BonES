package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func ConnectDB() {
	// Load env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	mongoURI := os.Getenv("MONGO_URI")
	dbName := os.Getenv("DB_NAME")

	if mongoURI == "" || dbName == "" {
		log.Fatal("MONGO_URI and DB_NAME must be set in environment variables")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Updated connection method
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Failed to create MongoDB client:", err)
	}

	// Ping to check connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}

	fmt.Printf("✅ Connected to MongoDB Atlas - Database: %s\n", dbName)
	DB = client.Database(dbName)
}