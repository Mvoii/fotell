// fotell/api/main.go
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/esiepe/fotell/amm"
	"github.com/esiepe/fotell/api/handlers"
	"github.com/esiepe/fotell/api/middleware"
	"github.com/esiepe/fotell/api/repository"
	"github.com/esiepe/fotell/api/startup"
	"github.com/esiepe/fotell/api/workers"
	"github.com/joho/godotenv"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
)

/*
main.go - http server
*/

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	requiredEnvVars := []string{"DATABASE_URL", "JWT_SECRET"}
	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			log.Fatalf("FATAL: %s env vars is required", envVar)
		}
	}

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		Environment: getEnv("ENV", "development"),
	}

	if len(cfg.JWTSecret) < 32 {
		log.Fatal("FATAL: JWT_SECRET must be at least 32 chars")
	}

	db, err := repository.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer db.Close()

	log.Println("Database connection established")

	// Initialize repositories (data access layer)
	userRepo := repository.NewUserRepository(db)
	marketRepo := repository.NewMarketRepository(db)
	tradeRepo := repository.NewTradeRepository(db)
	positionRepo := repository.NewPositionRepository(db)
	balanceRepo := repository.NewBalanceRepository(db)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db)
	commentRepo := repository.NewCommentRepository(db)

	// Initialize AMM registry (in-memory market state)
	registry := amm.NewRegistry()

	// Load active markets from DB into registry
	if err := startup.LoadActiveMarkets(context.Background(), marketRepo, registry); err != nil {
		log.Fatalf("CRITICAL: Failed to load active markets: %v", err)
	}

	// settlement minions
	settlementMinion := workers.NewSettlementMinon(db)

	minionCtx, minionCancel := context.WithCancel(context.Background())
	defer minionCancel()

	settlementMinion.Start(minionCtx)

	log.Println("settlement minions init")

	// Initialize handlers (HTTP request handlers)
	authHandler := handlers.NewAuthHandler(userRepo, refreshTokenRepo, cfg.JWTSecret)
	marketHandler := handlers.NewMarketHandler(marketRepo, registry)
	tradeHandler := handlers.NewTradeHandler(tradeRepo, balanceRepo, marketRepo, positionRepo, registry)
	userHandler := handlers.NewUserHandler(userRepo, balanceRepo)
	commentHandler := handlers.NewCommentHandler(commentRepo, marketRepo)

	// Build router with middleware stack
	r := chi.NewRouter()

	// Global middleware (applied to all routes)
	r.Use(chimiddleware.RequestID)                 // Inject request ID for tracing
	r.Use(chimiddleware.RealIP)                    // Get real client IP (behind proxy)
	r.Use(chimiddleware.Logger)                    // Log every request
	r.Use(chimiddleware.Recoverer)                 // Recover from panics
	r.Use(chimiddleware.Timeout(60 * time.Second)) // Request timeout

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   getAllowedOrigins(cfg.Environment),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link", "X-RateLimit-*"},
		AllowCredentials: true,
		MaxAge:           300, // 5 minutes
	}))

	// Global rate limiting (100 req/min per IP)
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	// Security headers
	r.Use(middleware.SecurityHeaders)

	// Public routes (no authentication required)
	r.Route("/api/v1", func(r chi.Router) {

		// Health check
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(200)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "healthy",
				"time":   time.Now().UTC().Format(time.RFC3339),
			})
		})

		// Authentication
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/refresh", authHandler.RefreshToken)
		r.Post("/auth/logout", authHandler.Logout)

		// Public market data (read-only)
		r.Get("/markets", marketHandler.ListMarkets)
		r.Get("/markets/{marketID}", marketHandler.GetMarket)
		r.Get("/markets/{marketID}/prices", marketHandler.GetPrices)
		r.Get("/markets/{marketID}/trades", marketHandler.ListMarketTrades)

		// public comments routes
		r.Get("/markets/{marketID}/comments", commentHandler.ListMarketComments)
		r.Get("/comments/{commentID}/replies", commentHandler.ListCommentReplies)
		r.Get("/markets/{marketID}/comments", commentHandler.ListMarketComments)
		r.Get("/comments/{commentID}/replies", commentHandler.ListCommentReplies)

		// ── Protected routes (authentication required)
		r.Group(func(r chi.Router) {
			// JWT authentication middleware
			r.Use(middleware.AuthMiddleware(cfg.JWTSecret))

			// Stricter rate limiting for authenticated users (200 req/min)
			r.Use(httprate.LimitByIP(200, 1*time.Minute))

			// User routes
			r.Get("/users/me", userHandler.GetMe)
			r.Get("/users/me/balance", userHandler.GetBalance)
			r.Get("/users/me/positions", userHandler.GetPositions)
			r.Get("/users/me/trades", userHandler.GetMyTrades)

			// Trading
			r.Post("/markets/{marketID}/trades", tradeHandler.PlaceTrade)

			// comments
			r.Post("/markets/{marketID}/comments", commentHandler.CreateComment)
			r.Post("/comments/{commentID}/replies", commentHandler.CreateReply)

			r.Patch("/comments/{commentID}", commentHandler.UpdateComment)
			r.Delete("/comments/{commentID}", commentHandler.DeleteComment)
			r.Patch("/comments/{commentID}", commentHandler.UpdateComment)
			r.Delete("/comments/{commentID}", commentHandler.DeleteComment)

			r.Post("/comments/{commentID}/vote", commentHandler.VoteComment)
			r.Post("/comments/{commentID}/vote", commentHandler.VoteComment)

			// ── Admin routes (admin role required)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireAdmin)

				// Market management
				r.Post("/admin/markets", marketHandler.CreateMarket)
				r.Post("/admin/markets/{marketID}/open", marketHandler.OpenMarket)
				r.Post("/admin/markets/{marketID}/close", marketHandler.CloseMarket)
				r.Post("/admin/markets/{marketID}/resolve", marketHandler.ResolveMarket)

				r.Get("/admin/settlement/status", func(w http.ResponseWriter, r *http.Request) { 
					status, err := settlementMinion.GetSettlementStatus(r.Context())
					            if err != nil {
									handlers.ErrorJSON(w, 500, "Failed to get settlement status", nil)
									return
								}
								handlers.JSON(w, 200, map[string]interface{}{
									"settlements": status,
								})})

				// User management
				// r.Get("/admin/users", userHandler.ListUsers)
				// r.Get("/admin/users/{userID}", userHandler.GetUser)
				// r.Post("/admin/users/{userID}/deactivate", userHandler.DeactivateUser)
			})
		})
	})

	// Start HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down server...")

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf(" Server starting on port %s (env: %s)", cfg.Port, cfg.Environment)
	log.Printf(" Server starting on port %s (env: %s)", cfg.Port, cfg.Environment)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}

	log.Println("Server stopped")
}

// Config holds application configuration
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	Environment string
}

// getEnv retrieves an environment variable with a default fallback
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getAllowedOrigins returns CORS allowed origins based on environment
func getAllowedOrigins(env string) []string {
	if env == "production" {
		return []string{
			"https://fotell.com",
			"https://www.fotell.com",
			"https://app.fotell.com",
		}
	}
	// Development: allow localhost
	return []string{
		"http://localhost:3000",
		"http://localhost:5173", // Vite default
		"http://127.0.0.1:3000",
	}
}
