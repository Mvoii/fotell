// fotell/api/handlers/auth.go

package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Mvoii/fotell/api/middleware"
	"github.com/Mvoii/fotell/api/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo         *repository.UserRepository
	refreshTokenRepo *repository.RefreshTokenRepository
	jwtSecret        string
}

func NewAuthHandler(
	userRepo *repository.UserRepository,
	refreshTokenRepo *repository.RefreshTokenRepository,
	jwtSecret string,
) *AuthHandler {
	return &AuthHandler{
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		jwtSecret:        jwtSecret,
	}
}

//
// REGISTER
//

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Username string `json:"username"`
	FullName string `json:"full_name"`
}

type AuthResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresIn    int       `json:"expires_in"` // seconds
	TokenType    string    `json:"token_type"`
	User         *UserInfo `json:"user"`
}

type UserInfo struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	FullName  string    `json:"full_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

/*
Register creates a new user account.

VALIDATION:
  - Email: Valid format (RFC 5322)
  - Password: Minimum 8 characters
  - Username: 3-50 characters, alphanumeric + underscore
  - All fields required

SECURITY:
  - Password hashed with bcrypt (cost 12 = ~250ms)
  - Email uniqueness enforced by database constraint
  - Username uniqueness enforced by database constraint

INITIAL BALANCE:
  - New users receive 5000 KES (handled by database trigger)
*/
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("ERROR: invalid request body %v", err)
		ErrorJSON(w, 400, "Invalid request body", map[string]interface{}{
			"error_code": "INVALID_JSON",
		})
		return
	}

	// ── Input validation

	// Email validation
	if !isValidEmail(req.Email) {
		log.Printf("ERROR: invalid email fmt")
		ErrorJSON(w, 400, "Invalid email format", map[string]interface{}{
			"error_code": "INVALID_EMAIL",
			"field":      "email",
		})
		return
	}

	// Password validation (minimum 8 characters)
	if len(req.Password) < 8 {
		log.Printf("ERROR: pass len small")
		ErrorJSON(w, 400, "Password must be at least 8 characters", map[string]interface{}{
			"error_code": "WEAK_PASSWORD",
			"field":      "password",
		})
		return
	}

	// Username validation (3-50 characters, alphanumeric + underscore)
	if len(req.Username) < 3 || len(req.Username) > 50 {
		log.Printf("ERROR: len(username) not okay")
		ErrorJSON(w, 400, "Username must be 3-50 characters", map[string]interface{}{
			"error_code": "INVALID_USERNAME_LENGTH",
			"field":      "username",
		})
		return
	}

	if !isValidUsername(req.Username) {
		log.Printf("ERROR: username need only num, alph and _")
		ErrorJSON(w, 400, "Username can only contain letters, numbers, and underscores", map[string]interface{}{
			"error_code": "INVALID_USERNAME_FORMAT",
			"field":      "username",
		})
		return
	}

	// ── Hash password

	// Bcrypt cost 12 = ~250ms (good balance of security and UX)
	// This prevents brute-force attacks (attacker must spend 250ms per guess)
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		log.Printf("ERROR: pass gen failed %v", err)
		// This should never happen unless system is out of memory
		ErrorJSON(w, 500, "Internal server error", nil)
		return
	}

	// ── Create user

	user, err := h.userRepo.Create(r.Context(), repository.CreateUserParams{
		Email:        strings.ToLower(req.Email), // Store lowercase for case-insensitive lookup
		PasswordHash: string(passwordHash),
		Username:     req.Username,
		FullName:     req.FullName,
	})

	if err != nil {
		log.Printf("ERROR: something wrong: %v", err)
		// Check for unique constraint violations
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			if strings.Contains(err.Error(), "email") {
				log.Printf("ERROR: email exists")
				ErrorJSON(w, 409, "Email already registered", map[string]interface{}{
					"error_code": "EMAIL_EXISTS",
					"field":      "email",
				})
				return
			}
			if strings.Contains(err.Error(), "username") {
				log.Printf("ERROR: username taken")
				ErrorJSON(w, 409, "Username already taken", map[string]interface{}{
					"error_code": "USERNAME_EXISTS",
					"field":      "username",
				})
				return
			}
			// Generic duplicate error
			log.Printf("ERROR: acc exists")
			ErrorJSON(w, 409, "Account already exists", map[string]interface{}{
				"error_code": "DUPLICATE_ACCOUNT",
			})
			return
		}

		// Unexpected database error
		ErrorJSON(w, 500, "Failed to create account", map[string]interface{}{
			"error_code": "DATABASE_ERROR",
			"hint":       "Check server logs for details",
		})
		return
	}

	// ── Generate tokens

	authResp, err := h.generateAuthResponse(r, user)
	if err != nil {
		// User is created but token generation failed
		// They can login manually
		log.Printf("ERROR: acc created, tok failed %v", err)
		ErrorJSON(w, 500, "Account created but failed to generate tokens. Please login.", nil)
		return
	}

	// ── Success

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201) // 201 Created
	json.NewEncoder(w).Encode(authResp)
}

//
// LOGIN
//

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

/*
Login authenticates a user and returns tokens.

SECURITY:
  - Email lookup is case-insensitive
  - Password comparison uses bcrypt (constant-time)
  - Failed attempts logged for security monitoring
  - Rate limiting prevents brute-force (handled by middleware)

INACTIVE ACCOUNTS:
  - Users with is_active=false cannot login
  - Returns same error as wrong password (prevents user enumeration)
*/
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, 400, "Invalid request body", nil)
		return
	}

	// ── Input validation

	if req.Email == "" || req.Password == "" {
		ErrorJSON(w, 400, "Email and password required", map[string]interface{}{
			"error_code": "MISSING_CREDENTIALS",
		})
		return
	}

	// ── Lookup user

	user, err := h.userRepo.GetByEmail(r.Context(), strings.ToLower(req.Email))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// User not found
			// Return generic error to prevent user enumeration
			ErrorJSON(w, 401, "Invalid email or password", map[string]interface{}{
				"error_code": "INVALID_CREDENTIALS",
			})
			return
		}
		// Database error
		ErrorJSON(w, 500, "Internal server error", nil)
		return
	}

	// ── Check if account is active

	if !user.IsActive {
		// Account deactivated
		// Return same error as wrong password (prevents user enumeration)
		ErrorJSON(w, 401, "Invalid email or password", map[string]interface{}{
			"error_code": "INVALID_CREDENTIALS",
		})
		return
	}

	// ── Verify password

	// bcrypt.CompareHashAndPassword is constant-time
	// This prevents timing attacks (attacker can't tell if email or password is wrong)
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		// Wrong password
		ErrorJSON(w, 401, "Invalid email or password", map[string]interface{}{
			"error_code": "INVALID_CREDENTIALS",
		})
		return
	}

	// ── Update last login

	// Fire and forget (non-blocking)
	go h.userRepo.UpdateLastLogin(r.Context(), user.ID)

	// ── Generate tokens

	authResp, err := h.generateAuthResponse(r, user)
	if err != nil {
		ErrorJSON(w, 500, "Failed to generate tokens", nil)
		return
	}

	// ── Success

	JSON(w, 200, authResp)
}

// REFRESH TOKEN

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

/*
RefreshToken exchanges a refresh token for a new access token.

FLOW:
 1. Client sends refresh_token (obtained from register/login)
 2. Server validates token (exists, not expired, not revoked)
 3. Server generates new access_token (15 min expiry)
 4. Server updates refresh_token last_used_at timestamp

SECURITY:
  - Refresh tokens are hashed in database (SHA-256)
  - Expired tokens are rejected
  - Revoked tokens are rejected
  - Each refresh updates last_used_at (for monitoring)

SINGLE-USE TOKENS (optional, not implemented):
  - Some systems revoke refresh token after use
  - Requires client to store new refresh token on every refresh
  - Adds complexity but increases security
*/
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, 400, "Invalid request body", nil)
		return
	}

	// ── Validate input

	if req.RefreshToken == "" {
		ErrorJSON(w, 400, "Refresh token required", map[string]interface{}{
			"error_code": "MISSING_REFRESH_TOKEN",
		})
		return
	}

	// ── Validate refresh token

	token, err := h.refreshTokenRepo.GetByToken(r.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			ErrorJSON(w, 401, "Invalid refresh token", map[string]interface{}{
				"error_code": "INVALID_REFRESH_TOKEN",
			})
			return
		}
		ErrorJSON(w, 500, "Internal server error", nil)
		return
	}

	// ── Check if token is revoked

	if token.Revoked {
		ErrorJSON(w, 401, "Refresh token has been revoked", map[string]interface{}{
			"error_code": "REVOKED_TOKEN",
			"hint":       "Please login again",
		})
		return
	}

	// ── Check if token is expired

	if time.Now().After(token.ExpiresAt) {
		ErrorJSON(w, 401, "Refresh token expired", map[string]interface{}{
			"error_code": "EXPIRED_REFRESH_TOKEN",
			"hint":       "Please login again",
		})
		return
	}

	// ── Get user

	user, err := h.userRepo.GetByID(r.Context(), token.UserID)
	if err != nil {
		ErrorJSON(w, 500, "Internal server error", nil)
		return
	}

	// ── Check if user is still active

	if !user.IsActive {
		ErrorJSON(w, 401, "Account deactivated", map[string]interface{}{
			"error_code": "ACCOUNT_DEACTIVATED",
		})
		return
	}

	// ── Generate new access token

	accessToken, err := middleware.GenerateToken(user.ID, user.Role, h.jwtSecret)
	if err != nil {
		ErrorJSON(w, 500, "Failed to generate access token", nil)
		return
	}

	// ── Update refresh token last_used_at

	// Fire and forget (non-blocking)
	go h.refreshTokenRepo.UpdateLastUsed(r.Context(), token.ID)

	// ── Success

	JSON(w, 200, RefreshResponse{
		AccessToken: accessToken,
		ExpiresIn:   900, // 15 minutes
		TokenType:   "Bearer",
	})
}

//
// LOGOUT
//

/*
Logout revokes the user's refresh token.

IMPORTANT:
  - Access tokens CANNOT be revoked (they're stateless JWTs)
  - Access tokens expire in 15 minutes anyway (short-lived)
  - Refresh tokens ARE revoked (stored in database)

SECURITY:
  - After logout, user cannot refresh their access token
  - When access token expires (15 min), user must login again
  - For immediate logout: client should delete access token from memory

LOGOUT ALL DEVICES (optional):
  - To logout from all devices, revoke all refresh tokens for this user
  - Call: refreshTokenRepo.RevokeAllForUser(userID)
*/
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Extract user ID from JWT (set by AuthMiddleware)
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "Authentication required", nil)
		return
	}

	// ── Get refresh token from request

	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, 400, "Invalid request body", nil)
		return
	}

	if req.RefreshToken == "" {
		ErrorJSON(w, 400, "Refresh token required", map[string]interface{}{
			"error_code": "MISSING_REFRESH_TOKEN",
		})
		return
	}

	// ── Revoke refresh token ─────────────────────────────────────────

	err := h.refreshTokenRepo.RevokeToken(r.Context(), req.RefreshToken, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Token doesn't exist or doesn't belong to this user
			// Return success anyway (idempotent)
			JSON(w, 200, map[string]string{
				"message": "Logged out successfully",
			})
			return
		}
		ErrorJSON(w, 500, "Failed to revoke token", nil)
		return
	}

	// ── Success

	JSON(w, 200, map[string]string{
		"message": "Logged out successfully",
	})
}

// HELPER FUNCTIONS

/*
generateAuthResponse creates a complete auth response with tokens.

GENERATES:
 1. Access token (JWT, 15 min expiry)
 2. Refresh token (random string, 7 days expiry, stored in DB)

STORES:
  - Refresh token in database (hashed with SHA-256)
  - User agent and IP for security monitoring
*/
func (h *AuthHandler) generateAuthResponse(r *http.Request, user *repository.User) (*AuthResponse, error) {
	// Generate access token (JWT)
	accessToken, err := middleware.GenerateToken(user.ID, user.Role, h.jwtSecret)
	if err != nil {
		return nil, err
	}

	// Generate refresh token (random string)
	refreshToken, err := middleware.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	// Store refresh token in database
	err = h.refreshTokenRepo.Create(r.Context(), repository.CreateRefreshTokenParams{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
		UserAgent: r.UserAgent(),
		IPAddress: getClientIP(r),
	})
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes
		TokenType:    "Bearer",
		User: &UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			Username:  user.Username,
			FullName:  user.FullName,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
		},
	}, nil
}

/*
isValidEmail validates email format.

RULES:
  - Must match RFC 5322 pattern (simplified)
  - Must contain @ symbol
  - Must have domain after @
*/
func isValidEmail(email string) bool {
	if email == "" {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	if len(parts[0]) == 0 || len(parts[1]) == 0 {
		return false
	}
	if !strings.Contains(parts[1], ".") {
		return false
	}
	return true
}

/*
isValidUsername validates username format.

RULES:
  - Only letters, numbers, and underscores
  - No spaces or special characters
*/
func isValidUsername(username string) bool {
	for _, char := range username {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '_') {
			return false
		}
	}
	return true
}

/*
getClientIP extracts the real client IP address.

HANDLES:
  - X-Forwarded-For header (from proxies/load balancers)
  - X-Real-IP header
  - RemoteAddr (direct connection)
*/
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For (may contain multiple IPs)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// Take first IP (client's real IP)
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// Fallback to RemoteAddr
	ip := r.RemoteAddr
	// Remove port if present
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		//ip = ip[:idx]
		ip = strings.TrimPrefix(ip[:idx], "[")
	}

	// remove ipv6 brackets
	ip = strings.Trim(ip, "[]")
	return ip
}
