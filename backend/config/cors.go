package config

import (
	"net/http"
	"os"
)

// AllowedOrigin returns the CORS origin from env, defaulting to localhost for dev.
func AllowedOrigin() string {
	if o := os.Getenv("ALLOWED_ORIGINS"); o != "" {
		return o
	}
	return "http://localhost:5173"
}

// SetCORSHeaders writes standard CORS headers onto the response.
func SetCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", AllowedOrigin())
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}
