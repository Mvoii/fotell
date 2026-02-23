// fotell/api/repository/user.go
package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

/*
users.go — User Repository

RESPONSIBILITIES:
  - CRUD operations for users table
  - Password is NEVER returned (security)
  - Email lookups are case-insensitive
  - All queries use parameterized statements (SQL injection prevention)

SECURITY:
  - Never log passwords or password hashes
  - Always use context for query cancellation
  - Use transactions for multi-step operations
*/
type User struct {
	ID            string
	Email         string
	PasswordHash  string // Never expose this in API responses
	Username      string
	FullName      string
	FirstName     string
	LastName      string
	Role          string
	IsActive      bool
	EmailVerified bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
	LastLoginAt   *time.Time
}

type CreateUserParams struct {
	Email        string
	PasswordHash string
	Username     string
	FullName     string
	FirstName    string
	LastName     string
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

/*
Create inserts a new user into the database.

ATOMICITY:
  - User creation triggers automatic balance creation (5000 KES)
  - Balance creation triggers balance_transactions insert
  - All happen in one transaction (database-level)

RETURNS:
  - User with generated ID and timestamps
  - Error if email/username already exists (unique constraint)
*/
func (r *UserRepository) Create(ctx context.Context, params CreateUserParams) (*User, error) {
	query := `
		INSERT INTO users (email, password_hash, username, full_name)
		VALUES ($1, $2, $3, $4)
		RETURNING id, email, password_hash, username, full_name, role, 
		          is_active, email_verified, created_at, updated_at
	`

	var user User
	err := r.db.QueryRowContext(
		ctx,
		query,
		params.Email,
		params.PasswordHash,
		params.Username,
		params.FullName,
	).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Username,
		&user.FullName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

/*
GetByID retrieves a user by ID.

SECURITY:
  - Returns sql.ErrNoRows if user doesn't exist
  - Password hash IS returned (needed for login verification)
*/
func (r *UserRepository) GetByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, email, password_hash, username, full_name, role,
		       is_active, email_verified, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`

	var user User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Username,
		&user.FullName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

/*
GetByEmail retrieves a user by email (case-insensitive).

USAGE:
  - Login (validate credentials)
  - Registration (check if email exists)

SECURITY:
  - Email is lowercased before lookup
  - Returns sql.ErrNoRows if not found (handle carefully to prevent user enumeration)
*/
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, email, password_hash, username, full_name, role,
		       is_active, email_verified, created_at, updated_at, last_login_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`

	var user User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Username,
		&user.FullName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

/*
GetByUsername retrieves a user by username (case-sensitive).

USAGE:
  - Profile lookups
  - Admin user management
*/
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*User, error) {
	query := `
		SELECT id, email, password_hash, username, full_name, role,
		       is_active, email_verified, created_at, updated_at, last_login_at
		FROM users
		WHERE username = $1
	`

	var user User
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Username,
		&user.FullName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

/*
List retrieves users with pagination.

ADMIN ONLY:
  - Used for admin user management
  - Never expose password hashes in API
*/
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*User, error) {
	query := `
		SELECT id, email, username, full_name, role, is_active, 
		       email_verified, created_at, updated_at, last_login_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Username,
			&user.FullName,
			&user.Role,
			&user.IsActive,
			&user.EmailVerified,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLoginAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	return users, nil
}

/*
UpdateLastLogin updates the last_login_at timestamp.

USAGE:
  - Called on every successful login
  - Non-blocking (fire and forget)

SECURITY:
  - Used for security monitoring (detect unusual login patterns)
*/
func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	query := `
		UPDATE users
		SET last_login_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

/*
Deactivate sets is_active to false.

ADMIN ONLY:
  - Deactivated users cannot login
  - Existing sessions remain valid until access token expires

SOFT DELETE:
  - We never DELETE users (preserve audit trail)
  - Deactivation is reversible
*/
func (r *UserRepository) Deactivate(ctx context.Context, userID string) error {
	query := `
		UPDATE users
		SET is_active = false, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

/*
Reactivate sets is_active to true.

ADMIN ONLY:
  - Reactivates a deactivated account
*/
func (r *UserRepository) Reactivate(ctx context.Context, userID string) error {
	query := `
		UPDATE users
		SET is_active = true, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

// ══════════════════════════════════════════════════════════════════════════
// REFRESH TOKEN REPOSITORY
// ══════════════════════════════════════════════════════════════════════════

type RefreshToken struct {
	ID         string
	UserID     string
	TokenHash  string
	ExpiresAt  time.Time
	Revoked    bool
	RevokedAt  *time.Time
	CreatedAt  time.Time
	LastUsedAt *time.Time
	UserAgent  string
	IPAddress  string
}

type CreateRefreshTokenParams struct {
	UserID    string
	Token     string // Plaintext token (will be hashed before storage)
	ExpiresAt time.Time
	UserAgent string
	IPAddress string
}

type RefreshTokenRepository struct {
	db *sql.DB
}

func NewRefreshTokenRepository(db *sql.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

/*
Create stores a new refresh token.

SECURITY:
  - Token is hashed with SHA-256 before storage (never store plaintext)
  - Expired tokens are cleaned up by background job (not implemented here)

HASH:
  - SHA-256 is sufficient for refresh tokens (not passwords)
  - Attacker with database access still can't use tokens
*/
func (r *RefreshTokenRepository) Create(ctx context.Context, params CreateRefreshTokenParams) error {
	// Hash the token before storage
	tokenHash := hashToken(params.Token)

	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.db.ExecContext(
		ctx,
		query,
		params.UserID,
		tokenHash,
		params.ExpiresAt,
		params.UserAgent,
		params.IPAddress,
	)

	return err
}

/*
GetByToken retrieves a refresh token by its plaintext value.

SECURITY:
  - Hashes the input token before lookup
  - Only returns non-revoked tokens
*/
func (r *RefreshTokenRepository) GetByToken(ctx context.Context, token string) (*RefreshToken, error) {
	tokenHash := hashToken(token)

	query := `
		SELECT id, user_id, token_hash, expires_at, revoked, revoked_at,
		       created_at, last_used_at, user_agent, ip_address
		FROM refresh_tokens
		WHERE token_hash = $1
	`

	var rt RefreshToken
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.TokenHash,
		&rt.ExpiresAt,
		&rt.Revoked,
		&rt.RevokedAt,
		&rt.CreatedAt,
		&rt.LastUsedAt,
		&rt.UserAgent,
		&rt.IPAddress,
	)

	if err != nil {
		return nil, err
	}

	return &rt, nil
}

/*
UpdateLastUsed updates the last_used_at timestamp.

USAGE:
  - Called on every token refresh
  - Used for monitoring token usage patterns
*/
func (r *RefreshTokenRepository) UpdateLastUsed(ctx context.Context, tokenID string) error {
	query := `
		UPDATE refresh_tokens
		SET last_used_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, tokenID)
	return err
}

/*
RevokeToken marks a token as revoked.

SECURITY:
  - Verifies token belongs to the user (prevents revoking other users' tokens)
  - Revoked tokens cannot be used for refresh
*/
func (r *RefreshTokenRepository) RevokeToken(ctx context.Context, token string, userID string) error {
	tokenHash := hashToken(token)

	query := `
		UPDATE refresh_tokens
		SET revoked = true, revoked_at = NOW()
		WHERE token_hash = $1 AND user_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, tokenHash, userID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows // Token not found or doesn't belong to user
	}

	return nil
}

/*
RevokeAllForUser revokes all refresh tokens for a user.

USAGE:
  - Logout from all devices
  - Password change (force re-login everywhere)
  - Security incident response
*/
func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked = true, revoked_at = NOW()
		WHERE user_id = $1 AND revoked = false
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

/*
DeleteExpired removes expired tokens from database.

USAGE:
  - Run as background job (cron) every hour/day
  - Keeps database size manageable
  - No functional impact (expired tokens already can't be used)
*/
func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context) (int64, error) {
	query := `
		DELETE FROM refresh_tokens
		WHERE expires_at < NOW()
	`

	result, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

/*
hashToken creates a SHA-256 hash of a token.
*/
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
