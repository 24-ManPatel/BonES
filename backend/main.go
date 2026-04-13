package main

import (
	"log"
	"net/http"
	"os"

	"backendd/config"
	"backendd/handlers"
	"backendd/middleware"

	"github.com/gorilla/mux"
)

func main() {
	// Connect to MongoDB
	config.ConnectDB()

	// Initialize router
	router := mux.NewRouter()

	// Enable CORS for all routes — origin read from ALLOWED_ORIGINS env var
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			config.SetCORSHeaders(w)
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Auth routes (no authentication required)
	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/register", handlers.Register).Methods("POST", "OPTIONS")
	auth.HandleFunc("/login", handlers.Login).Methods("POST", "OPTIONS")

	// V1 API routes (some might require authentication)
	v1 := api.PathPrefix("/v1").Subrouter()
	v1.HandleFunc("/matches", handlers.GetMatches).Methods("GET")
	v1.HandleFunc("/leaderboard", handlers.GetLeaderboard).Methods("GET", "OPTIONS")

	// Protected routes (require authentication)
	protected := v1.PathPrefix("/protected").Subrouter()
	protected.Use(func(next http.Handler) http.Handler {
		return middleware.AuthMiddleware(next.ServeHTTP)
	})

	// Prediction routes
	protected.HandleFunc("/predictions", handlers.CreatePrediction).Methods("POST", "OPTIONS")
	protected.HandleFunc("/predictions", handlers.GetUserPredictions).Methods("GET", "OPTIONS")
	protected.HandleFunc("/score", handlers.GetUserScore).Methods("GET", "OPTIONS")

	// Admin route to update prediction scores (can be called by cron job)
	api.HandleFunc("/admin/update-scores", handlers.UpdatePredictionScores).Methods("POST", "OPTIONS")

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","message":"Server is running"}`))
	}).Methods("GET")

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("🔗 Health check: http://localhost:%s/health", port)
	log.Printf("🔐 Auth endpoints:")
	log.Printf("   POST http://localhost:%s/api/auth/register", port)
	log.Printf("   POST http://localhost:%s/api/auth/login", port)
	log.Printf("📊 API endpoints:")
	log.Printf("   GET  http://localhost:%s/api/v1/matches", port)

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
