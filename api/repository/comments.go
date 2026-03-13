// fotell/api/repository/comments.go

package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"html"
	"log"
	"time"

	"github.com/lib/pq"
)

/*
comments.go — Comment Repository

RESPONSIBILITIES:
  - CRUD operations for hierarchical comments
  - Efficient loading of comment trees
  - Soft delete support (preserve thread structure)
  - Vote management
  - Content sanitization

PERFORMANCE:
  - Pagination at every level
  - Indexes on (market_id, parent_id, created_at)
  - Denormalized reply_count for fast display
  - Recursive CTEs for efficient tree loading

SECURITY:
  - HTML entity escaping (prevent XSS)
  - Content length limits (1-5000 chars)
  - Depth limits (max 5 levels)
  - Rate limiting (enforced at handler layer)
*/

// TYPEs

type Comment struct {
	ID         string     `json:"id"`
	MarketID   string     `json:"market_id"`
	UserID     string     `json:"user_id"`
	ParentID   *string    `json:"parent_id,omitempty"`
	Content    string     `json:"content"`
	Depth      int        `json:"depth"`
	ReplyCount int        `json:"reply_count"`
	IsDeleted  bool       `json:"is_deleted"`
	IsEdited   bool       `json:"is_edited"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty"`

	// Joined data (not stored in DB)
	Username  string  `json:"username,omitempty"`
	VoteCount int     `json:"vote_count,omitempty"`
	UserVote  *string `json:"user_vote,omitempty"` // UPVOTE, DOWNVOTE, or null
}

type CreateCommentParams struct {
	MarketID string
	UserID   string
	ParentID *string
	Content  string
}

type UpdateCommentParams struct {
	ID      string
	UserID  string // For authorization check
	Content string
}

type CommentVote struct {
	ID        string    `json:"id"`
	CommentID string    `json:"comment_id"`
	UserID    string    `json:"user_id"`
	VoteType  string    `json:"vote_type"` // UPVOTE or DOWNVOTE
	CreatedAt time.Time `json:"created_at"`
}

type CommentRepository struct {
	db *sql.DB
}

func NewCommentRepository(db *sql.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

// READ OPs

/*
ListByMarket retrieves top-level comments for a market (paginated).

PERFORMANCE:
  - Uses index: idx_comments_market_top_level
  - Only loads top-level (parent_id IS NULL)
  - Includes user info via JOIN
  - Excludes deleted comments

USAGE:
	comments, total, err := repo.ListByMarket(ctx, marketID, userID, 20, 0)
*/

func (r *CommentRepository) ListByMarket(ctx context.Context, marketID string, requestingUserID *string, limit int, offset int) ([]*Comment, int, error) {
	// Get total count
	var total int
	countQuery := `
		SELECT COUNT(*) 
		FROM comments 
		WHERE market_id = $1 AND parent_id IS NULL AND is_deleted = FALSE
	`

	err := r.db.QueryRowContext(ctx, countQuery, marketID).Scan(&total)
	if err != nil {
		log.Printf("ERROR: Failed to count comments: %v", err)
		return nil, 0, fmt.Errorf("failed to count comments: %w", err)
	}

	// Get comments with user info and vote counts
	query := `
		SELECT 
			c.id,
			c.market_id,
			c.user_id,
			c.parent_id,
			c.content,
			c.depth,
			c.reply_count,
			c.is_deleted,
			c.is_edited,
			c.created_at,
			c.updated_at,
			c.deleted_at,
			u.username,
			COALESCE(vote_counts.vote_count, 0) AS vote_count,
			user_votes.vote_type AS user_vote
		FROM comments c
		INNER JOIN users u ON c.user_id = u.id
		LEFT JOIN (
			SELECT comment_id, 
				   SUM(CASE WHEN vote_type = 'UPVOTE' THEN 1 WHEN vote_type = 'DOWNVOTE' THEN -1 ELSE 0 END) AS vote_count
			FROM comment_votes
			GROUP BY comment_id
		) vote_counts ON c.id = vote_counts.comment_id
		LEFT JOIN comment_votes user_votes ON c.id = user_votes.comment_id AND user_votes.user_id = $4
		WHERE c.market_id = $1 
		  AND c.parent_id IS NULL 
		  AND c.is_deleted = FALSE
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`

	var userIDParam interface{}
	if requestingUserID != nil {
		userIDParam = *requestingUserID
	} else {
		userIDParam = nil
	}

	rows, err := r.db.QueryContext(ctx, query, marketID, limit, offset, userIDParam)
	if err != nil {
		log.Printf("ERROR: Failed to query comments: %v", err)
		return nil, 0, fmt.Errorf("failed to list comments: %w", err)
	}
	defer rows.Close()

	comments := []*Comment{}
	for rows.Next() {
		var comment Comment
		var userVote sql.NullString

		err := rows.Scan(
			&comment.ID,
			&comment.MarketID,
			&comment.UserID,
			&comment.ParentID,
			&comment.Content,
			&comment.Depth,
			&comment.ReplyCount,
			&comment.IsDeleted,
			&comment.IsEdited,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&comment.DeletedAt,
			&comment.Username,
			&comment.VoteCount,
			&userVote,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan comment: %v", err)
			return nil, 0, fmt.Errorf("failed to scan comment: %w", err)
		}

		if userVote.Valid {
			comment.UserVote = &userVote.String
		}

		comments = append(comments, &comment)
	}

	return comments, total, nil
}

/*
ListReplies retrieves replies to a specific comment (paginated).

PERFORMANCE:
  - Uses index: idx_comments_parent_replies
  - Loads one level at a time (lazy loading)
  - Includes vote info

USAGE:

	replies, total, err := repo.ListReplies(ctx, commentID, userID, 20, 0)
*/
func (r *CommentRepository) ListReplies(ctx context.Context, parentID string, requestingUserID *string, limit int, offset int) ([]*Comment, int, error) {
	// Get total count
	var total int
	countQuery := `
		SELECT COUNT(*) 
		FROM comments 
		WHERE parent_id = $1 AND is_deleted = FALSE
	`
	err := r.db.QueryRowContext(ctx, countQuery, parentID).Scan(&total)
	if err != nil {
		log.Printf("ERROR: Failed to count replies: %v", err)
		return nil, 0, fmt.Errorf("failed to count replies: %w", err)
	}

	// Get replies
	query := `
		SELECT 
			c.id,
			c.market_id,
			c.user_id,
			c.parent_id,
			c.content,
			c.depth,
			c.reply_count,
			c.is_deleted,
			c.is_edited,
			c.created_at,
			c.updated_at,
			c.deleted_at,
			u.username,
			COALESCE(vote_counts.vote_count, 0) AS vote_count,
			user_votes.vote_type AS user_vote
		FROM comments c
		INNER JOIN users u ON c.user_id = u.id
		LEFT JOIN (
			SELECT comment_id, 
				   SUM(CASE WHEN vote_type = 'UPVOTE' THEN 1 WHEN vote_type = 'DOWNVOTE' THEN -1 ELSE 0 END) AS vote_count
			FROM comment_votes
			GROUP BY comment_id
		) vote_counts ON c.id = vote_counts.comment_id
		LEFT JOIN comment_votes user_votes ON c.id = user_votes.comment_id AND user_votes.user_id = $4
		WHERE c.parent_id = $1 AND c.is_deleted = FALSE
		ORDER BY c.created_at ASC
		LIMIT $2 OFFSET $3
	`

	var userIDParam interface{}
	if requestingUserID != nil {
		userIDParam = *requestingUserID
	} else {
		userIDParam = nil
	}

	rows, err := r.db.QueryContext(ctx, query, parentID, limit, offset, userIDParam)
	if err != nil {
		log.Printf("ERROR: Failed to query replies: %v", err)
		return nil, 0, fmt.Errorf("failed to list replies: %w", err)
	}
	defer rows.Close()

	replies := []*Comment{}
	for rows.Next() {
		var comment Comment
		var userVote sql.NullString

		err := rows.Scan(
			&comment.ID,
			&comment.MarketID,
			&comment.UserID,
			&comment.ParentID,
			&comment.Content,
			&comment.Depth,
			&comment.ReplyCount,
			&comment.IsDeleted,
			&comment.IsEdited,
			&comment.CreatedAt,
			&comment.UpdatedAt,
			&comment.DeletedAt,
			&comment.Username,
			&comment.VoteCount,
			&userVote,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan reply: %v", err)
			return nil, 0, fmt.Errorf("failed to scan reply: %w", err)
		}

		if userVote.Valid {
			comment.UserVote = &userVote.String
		}

		replies = append(replies, &comment)
	}

	return replies, total, nil
}

/*
GetByID retrieves a single comment by ID.

USAGE:

	comment, err := repo.GetByID(ctx, commentID, userID)
*/
func (r *CommentRepository) GetByID(ctx context.Context, id string, requestingUserID *string) (*Comment, error) {
	query := `
		SELECT 
			c.id,
			c.market_id,
			c.user_id,
			c.parent_id,
			c.content,
			c.depth,
			c.reply_count,
			c.is_deleted,
			c.is_edited,
			c.created_at,
			c.updated_at,
			c.deleted_at,
			u.username,
			COALESCE(vote_counts.vote_count, 0) AS vote_count,
			user_votes.vote_type AS user_vote
		FROM comments c
		INNER JOIN users u ON c.user_id = u.id
		LEFT JOIN (
			SELECT comment_id, 
				   SUM(CASE WHEN vote_type = 'UPVOTE' THEN 1 WHEN vote_type = 'DOWNVOTE' THEN -1 ELSE 0 END) AS vote_count
			FROM comment_votes
			GROUP BY comment_id
		) vote_counts ON c.id = vote_counts.comment_id
		LEFT JOIN comment_votes user_votes ON c.id = user_votes.comment_id AND user_votes.user_id = $2
		WHERE c.id = $1
	`

	var comment Comment
	var userVote sql.NullString
	var userIDParam interface{}
	if requestingUserID != nil {
		userIDParam = *requestingUserID
	} else {
		userIDParam = nil
	}

	err := r.db.QueryRowContext(ctx, query, id, userIDParam).Scan(
		&comment.ID,
		&comment.MarketID,
		&comment.UserID,
		&comment.ParentID,
		&comment.Content,
		&comment.Depth,
		&comment.ReplyCount,
		&comment.IsDeleted,
		&comment.IsEdited,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.DeletedAt,
		&comment.Username,
		&comment.VoteCount,
		&userVote,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		log.Printf("ERROR: Failed to get comment: %v", err)
		return nil, err
	}

	if userVote.Valid {
		comment.UserVote = &userVote.String
	}

	return &comment, nil
}

// CREATE

/*
Create creates a new comment or reply.

SECURITY:
  - Sanitizes content (HTML escape)
  - Validates length (1-5000 chars)
  - Checks depth limit (max 5 levels)
  - Prevents replies to deleted comments

ATOMICITY:
  - Uses transaction
  - Updates parent reply_count automatically (trigger)

USAGE:

	comment, err := repo.Create(ctx, CreateCommentParams{
		MarketID: marketID,
		UserID: userID,
		ParentID: &parentID, // nil for top-level
		Content: "Great prediction!",
	})
*/
func (r *CommentRepository) Create(ctx context.Context, params CreateCommentParams) (*Comment, error) {
	// Sanitize content
	sanitized := html.EscapeString(params.Content)

	// Validate length
	if len(sanitized) < 1 || len(sanitized) > 5000 {
		return nil, fmt.Errorf("content must be 1-5000 characters")
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Determine depth
	depth := 0
	if params.ParentID != nil {
		// Get parent depth and verify it's not deleted
		var parentDepth int
		var parentDeleted bool
		err := tx.QueryRowContext(
			ctx,
			`SELECT depth, is_deleted FROM comments WHERE id = $1`,
			*params.ParentID,
		).Scan(&parentDepth, &parentDeleted)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, fmt.Errorf("parent comment not found")
			}
			return nil, fmt.Errorf("failed to check parent: %w", err)
		}

		if parentDeleted {
			return nil, fmt.Errorf("cannot reply to deleted comment")
		}

		depth = parentDepth + 1
		if depth > 5 {
			return nil, fmt.Errorf("maximum nesting depth (5) exceeded")
		}
	}

	// Insert comment
	query := `
		INSERT INTO comments (
			market_id,
			user_id,
			parent_id,
			content,
			depth
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id, market_id, user_id, parent_id, content, depth, reply_count, 
		          is_deleted, is_edited, created_at, updated_at, deleted_at
	`

	var comment Comment
	err = tx.QueryRowContext(
		ctx,
		query,
		params.MarketID,
		params.UserID,
		params.ParentID,
		sanitized,
		depth,
	).Scan(
		&comment.ID,
		&comment.MarketID,
		&comment.UserID,
		&comment.ParentID,
		&comment.Content,
		&comment.Depth,
		&comment.ReplyCount,
		&comment.IsDeleted,
		&comment.IsEdited,
		&comment.CreatedAt,
		&comment.UpdatedAt,
		&comment.DeletedAt,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23503" { // Foreign key violation
				return nil, fmt.Errorf("invalid market_id or user_id")
			}
		}
		log.Printf("ERROR: Failed to create comment: %v", err)
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	// Commit transaction (reply_count incremented by trigger)
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &comment, nil
}

// UPDATE

/*
Update edits an existing comment.

SECURITY:
  - Only owner can edit
  - Sanitizes content
  - Sets is_edited flag
  - Optional: Edit window (e.g., 5 minutes)

USAGE:

	err := repo.Update(ctx, UpdateCommentParams{
		ID: commentID,
		UserID: userID,
		Content: "Updated content",
	})
*/
func (r *CommentRepository) Update(ctx context.Context, params UpdateCommentParams) error {
	// Sanitize content
	sanitized := html.EscapeString(params.Content)

	// Validate length
	if len(sanitized) < 1 || len(sanitized) > 5000 {
		return fmt.Errorf("content must be 1-5000 characters")
	}

	// Update (only if owner)
	query := `
		UPDATE comments
		SET content = $1,
		    is_edited = TRUE,
		    updated_at = NOW()
		WHERE id = $2 
		  AND user_id = $3 
		  AND is_deleted = FALSE
		RETURNING id
	`

	var returnedID string
	err := r.db.QueryRowContext(ctx, query, sanitized, params.ID, params.UserID).Scan(&returnedID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("comment not found or not authorized to edit")
		}
		log.Printf("ERROR: Failed to update comment: %v", err)
		return fmt.Errorf("failed to update comment: %w", err)
	}

	return nil
}

/*
SoftDelete marks a comment as deleted (preserves thread structure).

SECURITY:
  - Only owner can delete
  - Soft delete (sets is_deleted = TRUE)
  - Content replaced with "[deleted]"
  - Decrements parent reply_count (trigger)

USAGE:

	err := repo.SoftDelete(ctx, commentID, userID)
*/
func (r *CommentRepository) SoftDelete(ctx context.Context, commentID string, userID string) error {
	query := `
		UPDATE comments
		SET is_deleted = TRUE,
		    content = '[deleted]',
		    deleted_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1 
		  AND user_id = $2 
		  AND is_deleted = FALSE
		RETURNING id
	`

	var returnedID string
	err := r.db.QueryRowContext(ctx, query, commentID, userID).Scan(&returnedID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("comment not found or not authorized to delete")
		}
		log.Printf("ERROR: Failed to delete comment: %v", err)
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	return nil
}

// VOTE ops

/*
UpsertVote creates or updates a user's vote on a comment.

LOGIC:
  - If no vote exists: INSERT
  - If same vote: DELETE (remove vote)
  - If different vote: UPDATE

USAGE:

	err := repo.UpsertVote(ctx, commentID, userID, "UPVOTE")
*/
func (r *CommentRepository) UpsertVote(ctx context.Context, commentID string, userID string, voteType string) error {
	// Validate vote type
	if voteType != "UPVOTE" && voteType != "DOWNVOTE" {
		return fmt.Errorf("vote type must be UPVOTE or DOWNVOTE")
	}

	// Check if vote exists
	var existingVote sql.NullString
	err := r.db.QueryRowContext(
		ctx,
		`SELECT vote_type FROM comment_votes WHERE comment_id = $1 AND user_id = $2`,
		commentID,
		userID,
	).Scan(&existingVote)

	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("failed to check existing vote: %w", err)
	}

	// If same vote exists, remove it
	if existingVote.Valid && existingVote.String == voteType {
		_, err := r.db.ExecContext(
			ctx,
			`DELETE FROM comment_votes WHERE comment_id = $1 AND user_id = $2`,
			commentID,
			userID,
		)
		return err
	}

	// Otherwise, upsert
	query := `
		INSERT INTO comment_votes (comment_id, user_id, vote_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (comment_id, user_id) 
		DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = NOW()
	`

	_, err = r.db.ExecContext(ctx, query, commentID, userID, voteType)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23503" { // Foreign key violation
				log.Printf("ERROR: fk violation: %v : pq: %v", err, pqErr)
				return fmt.Errorf("comment not found")
			}
		}
		log.Printf("ERROR: Failed to upsert vote: %v", err)
		return fmt.Errorf("failed to vote: %w", err)
	}

	return nil
}
