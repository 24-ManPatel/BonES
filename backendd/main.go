package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"backendd/config"
    "backendd/handlers"


	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load env
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Connect DB
	config.ConnectDB()

	// Router
	r := mux.NewRouter()
	r.HandleFunc("/api/matches", handlers.GetMatches).Methods("GET")

	port := os.Getenv("PORT")
	fmt.Printf("🚀 Server running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
