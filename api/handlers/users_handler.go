// api/handlers/users_handler.go

package handlers

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/Mvoii/fotell/api/middleware"
	"github.com/Mvoii/fotell/api/repository"
	"github.com/go-chi/chi/v5"
)

/*
Users.go — User Profile and Data Handlers

ENDPOINTS:
  - GET /users/me          → Current user profile
  - GET /users/me/balance  → Current user balance
  - GET /users/me/positions → User positions (future)
  - GET /users/me/trades   → User trade history (future)

SECURITY:
  - All endpoints require authentication (JWT)
  - Users can ONLY access their own data
  - Password hash NEVER exposed in responses
  - RLS enforced at database level
*/

type UserHandler struct {
	userRepo     *repository.UserRepository
	balanceRepo  *repository.BalanceRepository
	positionRepo *repository.PositionRepository
	tradeRepo    *repository.TradeRepository
}

func NewUserHandler(
	userRepo *repository.UserRepository,
	balanceRepo *repository.BalanceRepository,
	positionRepo *repository.PositionRepository,
	tradeRepo *repository.TradeRepository,
) *UserHandler {
	return &UserHandler{
		userRepo:     userRepo,
		balanceRepo:  balanceRepo,
		positionRepo: positionRepo,
		tradeRepo:    tradeRepo,
	}
}

// GET /users/me - current user profile

/*
GetMe returns the authenticated user's profile

SECURITY:
  - User ID extracetd from JWT
  - Password hash excluded fro mresponse
  - Only returns data for authenticated user

REPONSE:

	 {
		"id": "uuid",
		"email": "user@example.com",
		"username": "username",
		"full_name": "FULL NAME",
		"role": "USER",
		"is_active": true,
		"email_verified": false,
		"created_at": "2024-02-22T12:00:00Z",
		"last_login_at": "2024-02-22T12:00:00Z"
	 }
*/
func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "Authentication required", map[string]interface{}{
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			ErrorJSON(w, 404, "user not found", map[string]interface{}{
				"error_code": "USER_NOT_FOUND",
			})
			return
		}
		ErrorJSON(w, 500, "failed to fetch user", nil)
		return
	}

	JSON(w, 200, map[string]interface{}{
		"id":             user.ID,
		"email":          user.Email,
		"username":       user.Username,
		"full_name":      user.FullName,
		"role":           user.Role,
		"is_active":      user.IsActive,
		"email_verified": user.EmailVerified,
		"created_at":     user.CreatedAt,
		"last_login_at":  user.LastLoginAt,
	})
}

// GET /user/me/balance - get current user balance

/*
GetBalance returns the authenticated user's current balance.

RESPONSE:

	{
	  "balance_smallest_unit": 5000000000000000000000,
	  "balance_kes": 5000.0
	}

SECURITY:
  - RLS ensures user can only see their own balance
  - Balance stored as integer (no float precision issues)
*/
func (h *UserHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "Authentication required", nil)
		return
	}

	// fecth balance
	balance, err := h.balanceRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// if not found, data integrity issue
			log.Printf("sql err: %v", err)
			ErrorJSON(w, 500, "Balance not found", map[string]interface{}{
				"error_code": "BALANCE_MISSING",
				"hint":       "Contact support",
			})
			return
		}
		log.Printf("balance err get: %v", err)
		ErrorJSON(w, 500, "failed to fetch balance", nil)
		return
	}

	// conv to KES (div by 10^18)
	// balanceKES := float64(balance.BalanceSmallestUnit) / 1e18

	balanceKES := float64(balance.BalanceSmallestUnit) / 100.0

	JSON(w, 200, map[string]interface{}{
		"balance_smallest_unit": balance.BalanceSmallestUnit,
		"balance_kes":           balanceKES,
	})
}

// GET /users/me/trade - get user trade history
/*
GetMyTrades returns trade history for the authenticated user.
*/
func (h *UserHandler) GetMyTrades(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "authentication required", nil)
		return
	}

	limit, offset := parsePagination(r, 50, 0)

	trades, total, err := h.tradeRepo.ListByUser(r.Context(), userID, limit, offset)
	if err != nil {
		log.Printf("ERROR: failed to fetch trades: %v", err)
		ErrorJSON(w, 500, "failed to retrieve trade history", nil)
		return
	}

	JSON(w, 200, map[string]interface{}{
		"trades": trades,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GET /users/me/positions - Get user positions
/*
GetPositions returns all positions for teh aithenticaed user
*/
func (h *UserHandler) GetPositions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "Authentication required", nil)
		return
	}

	positions, err := h.positionRepo.ListByUser(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: failed to fetch positions: %v", err)
		ErrorJSON(w, 500, "failed to retrieve positions", nil)
		return
	}

	JSON(w, 200, map[string]interface{}{
		"positions": positions,
	})
}

// ADMIN ENDPOINTS

/*
ListUsers returns paginated list of all users (admin only)
*/
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50, 0)

	users, err := h.userRepo.List(r.Context(), limit, offset)
	if err != nil {
		log.Printf("ERROR: failed to list users: %v", err)
		ErrorJSON(w, 500, "failed to list users", nil)
		return
	}

	// sanitize output
	for _, u := range users {
		u.PasswordHash = ""
	}

	JSON(w, 200, map[string]interface{}{
		"users":  users,
		"limit":  limit,
		"offset": offset,
	})
}

/*
GetUser returns details by ID (admin only)
*/
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	targetUserID := chi.URLParam(r, "userID")
	if targetUserID == "" {
		ErrorJSON(w, 400, "User ID required", nil)
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), targetUserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			ErrorJSON(w, 404, "user not found", nil)
			return
		}

		log.Printf("ERROR: failed to fetch user: %v", err)
		ErrorJSON(w, 500, "failed to fetch user", nil)
		return
	}

	user.PasswordHash = "" // hide hash

	JSON(w, 200, user)
}

/*
DeactivateUser deactivates a user account (admin only)
*/
func (h *UserHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	targetUserID := chi.URLParam(r, "userID")
	if targetUserID == "" {
		ErrorJSON(w, 400, "user id required", nil)
		return
	}

	err := h.userRepo.Deactivate(r.Context(), targetUserID)
	if err != nil {
		log.Printf("ERROR: failed to deactivate user: %v", err)
		ErrorJSON(w, 500, "failed to deactivate user", nil)
		return
	}

	JSON(w, 200, map[string]string{
		"message": "user deactivated successfully",
	})
}

// HELPER
func parsePagination(r *http.Request, defaultLimit, defaultOffset int) (int, int) {
	limit, offset := defaultLimit, defaultOffset

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
			if limit > 100 {
				limit = 100
			}
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err != nil && o >= 0 {
			offset = o
		}
	}

	return limit, offset
}
