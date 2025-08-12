package main

import (
    "log"
    "net/http"
    "os"

    "backendd/config"
    "backendd/handlers"
    
    "github.com/gorilla/mux"
    "github.com/joho/godotenv"
)

func main() {
    // Load .env file
    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    // Connect to MongoDB
    config.ConnectDB()

    // Initialize router
    router := mux.NewRouter()

    // API routes
    api := router.PathPrefix("/api/v1").Subrouter()
    api.HandleFunc("/matches", handlers.GetMatches).Methods("GET")
    
    // You can add more routes here later
    // api.HandleFunc("/matches/{id}", handlers.GetMatchByID).Methods("GET")
    // api.HandleFunc("/matches", handlers.CreateMatch).Methods("POST")

    // Get port from environment or default to 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("🚀 Server starting on port %s", port)
    log.Printf("📍 API endpoint: http://localhost:%s/api/v1/matches", port)
    
    if err := http.ListenAndServe(":"+port, router); err != nil {
        log.Fatal("Server failed to start:", err)
    }
}