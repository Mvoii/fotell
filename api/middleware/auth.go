// fotell/api/middleware/auth.go
package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	//"github.com/esiepe/fotell/api/handlers"
	"github.com/golang-jwt/jwt/v5"
)

/*
auth.go - authentication and authorization middleware

 - jwt bearer tkoesn in authorization header
 - tokens espire after 15 mins (shortlived toks)
 - refreshh tokens used for reauthetication (stored in db)
 - User ID injected into request context for downstream handlers

TOKEN VALIDATION:
 - extract token from authorization header
 - parse adn validate signature with hmac-sha256
 - check expiration
 - extract claims (userID, role)
 - inject into context

REVOCATION:
 - Tokens themselves are stateless (cannot be revoked)
 - refresh tokens can be revoked (stored indatabase)
 - logout must revoke refresh token, not access token
*/

// context keys for storing user data in request context
type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	UserRoleKey contextKey = "user_role"
)

// claims represents jwt custom claims
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

/*
AuthMiddleware validates jwt tokens and injects user context

  - use r.Use(middleware.AuthMiddleware(jwtSecret))

  - tokens must be signed with hmac sha256

  - ecpired tokens are rejected

  - userif and role injected into context for authorization checks
*/
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// extract token from authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeError(w, 401, "Authorization header required", nil)
				writeError(w, 401, "Authorization header required", nil)
				return
			}

			// expected fmt: "Bearer <token>"
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				writeError(w, 401, "Invalid auth header fmt", nil)
				return
			}

			tokenString := parts[1]

			token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
				// verify signing methods
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(jwtSecret), nil
			})

			/* if err != nil {
			/* if err != nil {
				if errors.Is(err, jwt.ErrTokenExpired) {
					writeError(w, 401, "Token expired", map[string]interface{}{
						"error_code": "TOKEN_EXPIRED",
						"hint":       "User /auth/refresh to get new token",
					})
					return
				}
				writeError(w, 401, "Invalid token", nil)
				return
			}

			// extract claims
			claims, ok := token.Claims.(*Claims)
			if !ok || !token.Valid {
				writeError(w, 401, "invalid token claims", nil)
				return
			}

			claims, ok := token.Claims.(*Claims)
			if !ok || !token.Valid {
				writeError(w, 401, "invalid token claims", nil)
				return
			} */

			if err != nil {
				// jwt.ParseWithClaims reurns a *jwt.Err on validation problems
				//var ve *jwt.ValidationError
				switch {
				case errors.Is(err, jwt.ErrTokenExpired):
					writeError(w, 401, "token expired", map[string]interface{}{
						"error_code": "TOKEN_EXPIRED",
						"hint":       "call /auth/refresh to get new token",
					})
					return

				case errors.Is(err, jwt.ErrTokenNotValidYet):
					writeError(w, 401, "tok not active yet", map[string]interface{}{
						"error_code": "TOKEN_NOT_ACTIVE",
					})
					return

				case errors.Is(err, jwt.ErrTokenSignatureInvalid):
					log.Printf("jwt signature invalid: %v", err)
					writeError(w, 401, "invalid tok signature", nil)
					return

				default:
					// other validation errors (malformed, signature invalid, etc)
					log.Printf("jwt parse error: %v", err)
					writeError(w, 401, "invalid token", nil)
					return
				}
			}

			claims, ok := token.Claims.(*Claims)
			if !ok || !token.Valid {
				log.Printf("invalid token claims: %v", token.Claims)
				writeError(w, 401, "invalid token claims", nil)
				return
			}

			// defensive: ensure user id calim exists
			if claims.UserID == "" {
				log.Printf("token parse but miss user_id: %#v", claims)
				writeError(w, 401, "Authentication required", map[string]interface{}{
					"error_code": "UNAUTHORIZED",
				})
				return
			}

			// inject user cxt
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)

			// call next handler with enriched cxt
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

/*
RequireAdmin ensures the authenticated user has admin role

use: r.Use(middleware.RequireAdmin)

  - must be used after authmiddleware
  - user ctx must be already injected
*/
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(string)
		if !ok {
			// should never happen if authmiddleware ran first
			writeError(w, 500, "internal error: user role not found", nil)
			return
		}

		if role != "ADMIN" {
			writeError(w, 403, "admin access required", map[string]interface{}{
				"error_code":    "FORBIDDEN",
				"required_role": "ADMIN",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

/*
GetUserID extract autehnticated user id from request ctx

returns empty string if called on unauth request
*/
func GetUserID(r *http.Request) string {
	userID, _ := r.Context().Value(UserIDKey).(string)
	return userID
}

/*
GetUserRole extracts the auth user's role from request context

Returns empty string if called on an unauth'e request
*/
func GetUserRole(r *http.Request) string {
	role, _ := r.Context().Value(UserRoleKey).(string)
	return role
}

/*
GenerateToken creates a JWT access token for a user

Access TOKEN:
  - Expires in 15 mins
  - contains userID and role claims
  - signed with hmacsha256
*/
func GenerateToken(userID, role, jwtSecret string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
			NotBefore: jwt.NewNumericDate(time.Now().UTC()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

/*
creates a crypto random 16 byte hex string (32 chars)

noshared state to lock
*/

func generateID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("crypto/rand read failed: %w", err)
	}
	return hex.EncodeToString(b), nil
}

/*
GenerateRefreshToken creates a cryptographically random refresh token.

SECURITY:
  - Uses crypto/rand (not math/rand - which is predictable)
  - 32 bytes of randomness (256 bits)
  - Hex-encoded for easy transmission

TOKEN FORMAT:
  - Example: "a3f5e8d9c1b2...64 hex characters"
  - Safe for URL, JSON, database storage
*/
func GenerateRefreshToken() (string, error) {
	// Generate 32 random bytes (256 bits of entropy)
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}

	// Encode as hex string (64 characters)
	return hex.EncodeToString(b), nil
}

/*
writeError writes a JSON error response.

This is an internal helper to avoid circular imports with the handlers package.
Middleware should not import handlers.
*/
func writeError(w http.ResponseWriter, statusCode int, message string, details interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	response := map[string]interface{}{
		"error": message,
	}

	if details != nil {
		response["details"] = details
	}

	json.NewEncoder(w).Encode(response)
}
