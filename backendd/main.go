package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "github.com/joho/godotenv"
    "os"
)

func main() {
    // Load .env
    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    mongoURI := os.Getenv("MONGO_URI")
    dbName := os.Getenv("MONGO_DB")
    collectionName := os.Getenv("MONGO_COLLECTION")

    // Connect to MongoDB
    client, err := mongo.NewClient(options.Client().ApplyURI(mongoURI))
    if err != nil {
        log.Fatal(err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    err = client.Connect(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect(ctx)

    // Fetch data
    collection := client.Database(dbName).Collection(collectionName)

    cursor, err := collection.Find(ctx, bson.M{})
    if err != nil {
        log.Fatal(err)
    }
    defer cursor.Close(ctx)

    fmt.Println("=== Matches from MongoDB Atlas ===")
    for cursor.Next(ctx) {
        var match bson.M
        if err := cursor.Decode(&match); err != nil {
            log.Fatal(err)
        }
        fmt.Println(match)
    }

    if err := cursor.Err(); err != nil {
        log.Fatal(err)
    }
}
