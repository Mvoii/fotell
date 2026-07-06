// fotell/api/handlers/comment_handler.go

package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/esiepe/fotell/api/middleware"
	"github.com/esiepe/fotell/api/repository"
	"github.com/go-chi/chi/v5"
)

/*
comment_handler.go — Comment Handler

FEATURES:
  - List top-level comments for a market
  - List replies to a comment
  - Create comment or reply
  - Edit own comment
  - Delete own comment
  - Vote on comments

SECURITY:
  - Rate limiting (max 10 comments/minute per user)
  - Input validation and sanitization
  - Authorization (only owner can edit/delete)
  - XSS prevention (HTML escaping in repo)

PERFORMANCE:
  - Pagination for all list operations
  - Lazy loading (load replies on demand)
  - Efficient DB queries with indexes
*/

type CommentHandler struct {
	commentRepo *repository.CommentRepository
	marketRepo  *repository.MarketRepository
	limiter     *RateLimiter
}

func NewCommentHandler(
	commentRepo *repository.CommentRepository,
	marketRepo *repository.MarketRepository,
) *CommentHandler {
	return &CommentHandler{
		commentRepo: commentRepo,
		marketRepo:  marketRepo,
		limiter:     NewRateLimiter(10, time.Minute), // 10 comments per minute
	}
}

// RATE LIMITER

type RateLimiter struct {
	requests map[string][]time.Time
	max      int
	window   time.Duration
}

func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		max:      max,
		window:   window,
	}
}

func (rl *RateLimiter) Allow(userID string) bool {
	now := time.Now()

	// Clean up old requests
	cutoff := now.Add(-rl.window)
	requests := rl.requests[userID]
	valid := []time.Time{}
	for _, t := range requests {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	// Check limit
	if len(valid) >= rl.max {
		rl.requests[userID] = valid
		return false
	}

	// Add new request
	valid = append(valid, now)
	rl.requests[userID] = valid
	return true
}

// LIST ENDPOINTS

/*
ListMarketComments handles GET /markets/{marketID}/comments

Returns top-level comments (parent_id IS NULL) with pagination.

Query params:
  - limit: Max results (default: 20, max: 100)
  - offset: Pagination offset (default: 0)
*/
func (h *CommentHandler) ListMarketComments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	marketID := chi.URLParam(r, "marketID")

	// Get requesting user (for vote info)
	var requestingUserID *string
	/* if userID, ok := ctx.Value("user_id").(string); ok {
		requestingUserID = &userID
	} */
	userID := middleware.GetUserID(r)
	if userID != "" {
		requestingUserID = &userID
	}

	// Parse pagination
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 100 {
				limit = 100
			}
		}
	}

	offset := 0
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Verify market exists
	_, err := h.marketRepo.GetByID(ctx, marketID)
	if err != nil {
		if err == repository.ErrNotFound {
			ErrorJSON(w, http.StatusNotFound, "Market not found", nil)
			return
		}
		log.Printf("ERROR: Failed to get market: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	// Get comments
	comments, total, err := h.commentRepo.ListByMarket(ctx, marketID, requestingUserID, limit, offset)
	if err != nil {
		log.Printf("ERROR: Failed to list comments: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to retrieve comments", nil)
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"comments": comments,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

/*
ListCommentReplies handles GET /comments/{commentID}/replies

Returns direct replies to a comment (one level only).

Query params:
  - limit: Max results (default: 20, max: 100)
  - offset: Pagination offset (default: 0)
*/
func (h *CommentHandler) ListCommentReplies(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	commentID := chi.URLParam(r, "commentID")

	// Get requesting user (for vote info)
	var requestingUserID *string
	userID := middleware.GetUserID(r)
	if userID != "" {
		requestingUserID = &userID
	}

	// Parse pagination
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 100 {
				limit = 100
			}
		}
	}

	offset := 0
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Verify parent comment exists
	parent, err := h.commentRepo.GetByID(ctx, commentID, requestingUserID)
	if err != nil {
		if err == repository.ErrNotFound {
			ErrorJSON(w, http.StatusNotFound, "Comment not found", nil)
			return
		}
		log.Printf("ERROR: Failed to get comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	// Don't allow fetching replies to deleted comments
	if parent.IsDeleted {
		ErrorJSON(w, http.StatusGone, "Comment has been deleted", nil)
		return
	}

	// Get replies
	replies, total, err := h.commentRepo.ListReplies(ctx, commentID, requestingUserID, limit, offset)
	if err != nil {
		log.Printf("ERROR: Failed to list replies: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to retrieve replies", nil)
		return
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"replies": replies,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

//
// CREATE ENDPOINTS
//

/*
CreateComment handles POST /markets/{marketID}/comments

Creates a top-level comment on a market.

Request body:

	{
		"content": "This is my comment"
	}
*/
func (h *CommentHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(r)
	marketID := chi.URLParam(r, "marketID")

	// Rate limiting
	if !h.limiter.Allow(userID) {
		ErrorJSON(w, http.StatusTooManyRequests, "Rate limit exceeded", map[string]interface{}{
			"error_code": "RATE_LIMIT_EXCEEDED",
			"hint":       "Maximum 10 comments per minute",
		})
		return
	}

	// Parse request
	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	// Validate content
	if len(req.Content) < 1 || len(req.Content) > 5000 {
		ErrorJSON(w, http.StatusBadRequest, "Content must be 1-5000 characters", map[string]interface{}{
			"error_code": "INVALID_CONTENT_LENGTH",
			"min":        1,
			"max":        5000,
		})
		return
	}

	// Verify market exists
	_, err := h.marketRepo.GetByID(ctx, marketID)
	if err != nil {
		if err == repository.ErrNotFound {
			ErrorJSON(w, http.StatusNotFound, "Market not found", nil)
			return
		}
		log.Printf("ERROR: Failed to get market: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	// Create comment
	comment, err := h.commentRepo.Create(ctx, repository.CreateCommentParams{
		MarketID: marketID,
		UserID:   userID,
		ParentID: nil,
		Content:  req.Content,
	})
	if err != nil {
		log.Printf("ERROR: Failed to create comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to create comment", nil)
		return
	}

	JSON(w, http.StatusCreated, comment)
}

/*
CreateReply handles POST /comments/{commentID}/replies

Creates a reply to an existing comment.

Request body:

	{
		"content": "This is my reply"
	}
*/
func (h *CommentHandler) CreateReply(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "Authentication required", nil)
		return
	}
	parentID := chi.URLParam(r, "commentID")

	// Rate limiting
	if !h.limiter.Allow(userID) {
		ErrorJSON(w, http.StatusTooManyRequests, "Rate limit exceeded", map[string]interface{}{
			"error_code": "RATE_LIMIT_EXCEEDED",
			"hint":       "Maximum 10 comments per minute",
		})
		return
	}

	// Parse request
	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	// Validate content
	if len(req.Content) < 1 || len(req.Content) > 5000 {
		ErrorJSON(w, http.StatusBadRequest, "Content must be 1-5000 characters", map[string]interface{}{
			"error_code": "INVALID_CONTENT_LENGTH",
			"min":        1,
			"max":        5000,
		})
		return
	}

	// Verify parent comment exists and get market_id
	parent, err := h.commentRepo.GetByID(ctx, parentID, nil)
	if err != nil {
		if err == repository.ErrNotFound {
			ErrorJSON(w, http.StatusNotFound, "Parent comment not found", nil)
			return
		}
		log.Printf("ERROR: Failed to get parent comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	// Can't reply to deleted comments
	if parent.IsDeleted {
		ErrorJSON(w, http.StatusGone, "Cannot reply to deleted comment", nil)
		return
	}

	// Create reply
	comment, err := h.commentRepo.Create(ctx, repository.CreateCommentParams{
		MarketID: parent.MarketID,
		UserID:   userID,
		ParentID: &parentID,
		Content:  req.Content,
	})
	if err != nil {
		if err.Error() == "maximum nesting depth (5) exceeded" {
			ErrorJSON(w, http.StatusBadRequest, "Maximum reply depth exceeded", map[string]interface{}{
				"error_code": "MAX_DEPTH_EXCEEDED",
				"max_depth":  5,
			})
			return
		}
		log.Printf("ERROR: Failed to create reply: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to create reply", nil)
		return
	}

	JSON(w, http.StatusCreated, comment)
}

//
// UPDATE/DELETE ENDPOINTS
//

/*
UpdateComment handles PATCH /comments/{commentID}

Updates a comment (owner only).

Request body:

	{
		"content": "Updated content"
	}
*/
func (h *CommentHandler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "Authentication required", nil)
		return
	}
	commentID := chi.URLParam(r, "commentID")

	// Parse request
	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	// Validate content
	if len(req.Content) < 1 || len(req.Content) > 5000 {
		ErrorJSON(w, http.StatusBadRequest, "Content must be 1-5000 characters", map[string]interface{}{
			"error_code": "INVALID_CONTENT_LENGTH",
		})
		return
	}

	// Update comment
	err := h.commentRepo.Update(ctx, repository.UpdateCommentParams{
		ID:      commentID,
		UserID:  userID,
		Content: req.Content,
	})
	if err != nil {
		if err.Error() == "comment not found or not authorized to edit" {
			ErrorJSON(w, http.StatusForbidden, "Not authorized to edit this comment", nil)
			return
		}
		log.Printf("ERROR: Failed to update comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to update comment", nil)
		return
	}

	// Get updated comment
	comment, err := h.commentRepo.GetByID(ctx, commentID, &userID)
	if err != nil {
		log.Printf("ERROR: Failed to get updated comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	JSON(w, http.StatusOK, comment)
}

/*
DeleteComment handles DELETE /comments/{commentID}

Soft deletes a comment (owner only).
*/
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "Authentication required", nil)
		return
	}
	commentID := chi.URLParam(r, "commentID")

	// Soft delete
	err := h.commentRepo.SoftDelete(ctx, commentID, userID)
	if err != nil {
		if err.Error() == "comment not found or not authorized to delete" {
			ErrorJSON(w, http.StatusForbidden, "Not authorized to delete this comment", nil)
			return
		}
		log.Printf("ERROR: Failed to delete comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to delete comment", nil)
		return
	}

	JSON(w, http.StatusOK, map[string]string{
		"message": "Comment deleted successfully",
	})
}

//
// VOTE ENDPOINTS
//

/*
VoteComment handles POST /comments/{commentID}/vote

Upvote or downvote a comment.

Request body:

	{
		"vote_type": "UPVOTE"  // or "DOWNVOTE"
	}

Clicking same vote again removes the vote.
*/
func (h *CommentHandler) VoteComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, http.StatusUnauthorized, "Authentication required", nil)
		return
	}
	commentID := chi.URLParam(r, "commentID")

	// Parse request
	var req struct {
		VoteType string `json:"vote_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, http.StatusBadRequest, "Invalid request body", nil)
		return
	}

	// Validate vote type
	if req.VoteType != "UPVOTE" && req.VoteType != "DOWNVOTE" {
		ErrorJSON(w, http.StatusBadRequest, "Vote type must be UPVOTE or DOWNVOTE", nil)
		return
	}

	// Verify comment exists
	_, err := h.commentRepo.GetByID(ctx, commentID, nil)
	if err != nil {
		if err == repository.ErrNotFound {
			ErrorJSON(w, http.StatusNotFound, "Comment not found", nil)
			return
		}
		log.Printf("ERROR: Failed to get comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	// Upsert vote
	err = h.commentRepo.UpsertVote(ctx, commentID, userID, req.VoteType)
	if err != nil {
		log.Printf("ERROR: Failed to vote: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Failed to vote", nil)
		return
	}

	// Get updated comment with new vote count
	comment, err := h.commentRepo.GetByID(ctx, commentID, &userID)
	if err != nil {
		log.Printf("ERROR: Failed to get updated comment: %v", err)
		ErrorJSON(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	JSON(w, http.StatusOK, comment)
}
