// fotell/api/handlers/market_handler.go

package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/esiepe/fotell/amm"
	"github.com/esiepe/fotell/api/middleware"
	"github.com/esiepe/fotell/api/repository"
	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"
)

/*
market_handlers.go - market mgmt handlers

PUBLIC ENDPOINTS (read only):
 - GET /markets
 - GET /amrkets/{id}
 - GET /markets/{id}/prices
 - GET /markets/{id}/trades

ADMIN ENDS (state mgmt):
 - POST /admin/markets - create market
 - POST /admin/markets/{id}/open - open market for trade
 - POST /admin/markets/{id}/close - close market
 - POST /admin/markets/{id}/resolve - resolve markets outcome

SECURITY:
 - Public routes: read-only, no auth req
 - Admin routes: jwt + admin roles req
 - state machine enforced (PENDING to OPEN ...)
 - All admin actions logged with user ID and timestamp
 - Input validation on all params
 - sql injection prevention via param queries
*/

type MarketHandler struct {
	marketRepo *repository.MarketRepository
	registry   *amm.Registry
}

func NewMarketHandler(marketRepo *repository.MarketRepository, registry *amm.Registry) *MarketHandler {
	return &MarketHandler{
		marketRepo: marketRepo,
		registry:   registry,
	}
}

//
// piblic ends
//
/*
ListMarket returns all markets with optional filtering

QUERY PARAMS:
 - status: filter by status
 - limit: max results (default: 50, max: 100)
 - offset: pagination offset (def: 0)

SECURITY:
 - no auth
 - rate limited by middeware
 - sql injection prevented via param queries

RESPONSE:
 {
	"markets": [...],
	"total": 42,
	"limit": 50,
	"offset": 0
 }
*/
func (h *MarketHandler) ListMarkets(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	// def vals
	limit := 50
	offset := 0

	// parse lim
	if limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed < 1 {
			log.Printf("parse_err: %w", err)
			ErrorJSON(w, 400, "invalid limit params", map[string]interface{}{
				"error_code": "INVALID_LIMIT",
				"hint":       "must be positive int",
			})
			return
		}
		if parsed > 100 {
			limit = 100
		} else {
			limit = parsed
		}
	}

	// parse offset
	if offsetStr != "" {
		parsed, err := strconv.Atoi(offsetStr)
		if err != nil || parsed < 0 {
			log.Printf("off_parse_err: %w", err)
			ErrorJSON(w, 400, "Invalid offset parameter", map[string]interface{}{
				"error_code": "INVALID_OFFSET",
			})
			return
		}
		offset = parsed
	}

	if status != "" {
		validStatuses := map[string]bool{
			"PENDING":  true,
			"OPEN":     true,
			"CLOSED":   true,
			"RESOLVED": true,
		}

		if !validStatuses[status] {
			log.Printf("invalid_status_err: %w", status)
			ErrorJSON(w, 400, "invalid status", map[string]interface{}{
				"error_code":     "INVALID_STATUS",
				"valid_statuses": []string{"PENDING", "CLOSED", "OPEN", "RESOLVED"},
			})
			return
		}
	}

	markets, total, err := h.marketRepo.List(r.Context(), status, limit, offset)
	if err != nil {
		log.Printf("ERROR: failed to list markets: %v", err)
		ErrorJSON(w, 500, "failed to fetch markets", nil)
		return
	}

	// enrich with curr prices
	for i, market := range markets {
		if market.Status == "OPEN" {
			ammMarket, err := h.registry.GetMarket(market.ID)
			if err != nil {
				log.Printf("err_fetch_amm_instance_from_reg: %v", err)
			}
			if ammMarket != nil {
				prices, err := ammMarket.GetPrices()
				if err == nil {
					yesFloat, _ := prices.YesPrice.Float64()
					noFloat, _ := prices.NoPrice.Float64()
					markets[i].YesPrice = &yesFloat
					markets[i].NoPrice = &noFloat
				}
			}
		}
	}

	JSON(w, 200, map[string]interface{}{
		"markets": markets,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

/*
GetMarket returns detailed information about a specific market.

PARAMETERS:
  - marketID: Market UUID (path parameter)

SECURITY:
  - No authentication required
  - Returns 404 if market doesn't exist (not 403 to avoid enumeration)

RESPONSE:

	{
	  "id": "uuid",
	  "question": "...",
	  "status": "OPEN",
	  "yes_price": 62.5,
	  "no_price": 37.5,
	  "liquidity_param": 500000,
	  "created_at": "...",
	  "closes_at": "...",
	  ...
	}
*/
func (h *MarketHandler) GetMarket(w http.ResponseWriter, r *http.Request) {
	marketID := chi.URLParam(r, "marketID")
	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Fetch market from database
	market, err := h.marketRepo.GetByID(r.Context(), marketID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			ErrorJSON(w, 404, "Market not found", map[string]interface{}{
				"error_code": "MARKET_NOT_FOUND",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch market: %v", err)
		ErrorJSON(w, 500, "Failed to fetch market", nil)
		return
	}

	// Get current prices if market is OPEN
	if market.Status == "OPEN" {
		ammMarket, err := h.registry.GetMarket(marketID)
		if err != nil {
			log.Printf("amm init err: %w", err)
		}
		if ammMarket != nil {
			prices, err := ammMarket.GetPrices()
			if err == nil {
				yesFloat, _ := prices.YesPrice.Float64()
				noFloat, _ := prices.NoPrice.Float64()
				market.YesPrice = &yesFloat
				market.NoPrice = &noFloat
			}
		}
	}

	JSON(w, 200, market)
}

/*
GetPrices returns current YES and NO prices for a market.

PARAMETERS:
  - marketID: Market UUID (path parameter)

SECURITY:
  - No authentication required
  - Only returns prices for OPEN markets

RESPONSE:

	{
	  "market_id": "uuid",
	  "yes_price": 62.5,
	  "no_price": 37.5,
	  "timestamp": "2024-02-22T12:00:00Z"
	}
*/
func (h *MarketHandler) GetPrices(w http.ResponseWriter, r *http.Request) {
	marketID := chi.URLParam(r, "marketID")
	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Check market exists and is OPEN
	market, err := h.marketRepo.GetByID(r.Context(), marketID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			ErrorJSON(w, 404, "Market not found", nil)
			return
		}
		log.Printf("err_get_amr_repo_id: %w", err)
		ErrorJSON(w, 500, "Failed to fetch market", nil)
		return
	}

	// Only OPEN markets have prices
	if market.Status != "OPEN" {
		ErrorJSON(w, 400, "Market not open for trading", map[string]interface{}{
			"error_code":     "MARKET_NOT_OPEN",
			"current_status": market.Status,
			"hint":           "Prices only available for OPEN markets",
		})
		return
	}

	// Get prices from AMM
	ammMarket, err := h.registry.GetMarket(marketID)
	if err != nil {
		log.Printf("that amm instance retrieve err: %v", err)
	}
	if ammMarket == nil {
		ErrorJSON(w, 500, "Market not loaded in AMM", map[string]interface{}{
			"error_code": "AMM_NOT_LOADED",
			"hint":       "Contact support",
		})
		return
	}

	prices, err := ammMarket.GetPrices()
	if err != nil {
		log.Printf("ERROR: Failed to get prices for market %s: %v", marketID, err)
		ErrorJSON(w, 500, "Failed to calculate prices", nil)
		return
	}

	yesFloat, _ := prices.YesPrice.Float64()
	noFloat, _ := prices.NoPrice.Float64()

	JSON(w, 200, map[string]interface{}{
		"market_id": marketID,
		"yes_price": yesFloat,
		"no_price":  noFloat,
		"timestamp": time.Now().UTC(),
	})
}

/*
ListMarketTrades returns trade history for a specific market.

PARAMETERS:
  - marketID: Market UUID (path parameter)
  - limit: Max results (query param)

SECURITY:
  - No authentication required
  - Returns public trade data (user IDs visible)
  - For user privacy: only show own trades if authenticated
*/
func (h *MarketHandler) ListMarketTrades(w http.ResponseWriter, r *http.Request) {
	marketID := chi.URLParam(r, "marketID")
	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// TODO: Implement when trade repository is ready
	ErrorJSON(w, 501, "Not implemented yet", map[string]interface{}{
		"error_code": "NOT_IMPLEMENTED",
		"hint":       "Trade history coming soon",
	})
}

//
// ADMIN ENDS
//

/*
CreateMarket creates a new prediction market.

REQUEST:

	{
	  "question": "Will Bitcoin reach $100k by end of month?",
	  "description": "Market resolves YES if...",
	  "closes_at": "2024-03-01T00:00:00Z",
	  "liquidity_param": 500000  // in cents
	}

SECURITY:
  - Admin authentication required
  - Input validation (question length, liquidity positive, closes_at in future)
  - All admin actions logged

STATE MACHINE:
  - Initial state: PENDING
  - Admin must call /open to start trading
*/
func (h *MarketHandler) CreateMarket(w http.ResponseWriter, r *http.Request) {
	// Get admin user ID from context
	adminID := middleware.GetUserID(r)
	if adminID == "" {
		ErrorJSON(w, 401, "Authentication required", nil)
		return
	}

	// Parse request
	var req struct {
		Question       string    `json:"question"`
		Description    string    `json:"description"`
		ClosesAt       time.Time `json:"closes_at"`
		LiquidityParam int64     `json:"liquidity_param"` // in cents
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, 400, "Invalid request body", map[string]interface{}{
			"error_code": "INVALID_JSON",
		})
		return
	}

	// ── Validation
	// Question validation
	if len(req.Question) < 1 || len(req.Question) > 500 {
		ErrorJSON(w, 400, "Question must be 1-500 characters", map[string]interface{}{
			"error_code": "INVALID_QUESTION_LENGTH",
			"field":      "question",
		})
		return
	}

	// Liquidity parameter validation
	if req.LiquidityParam <= 0 {
		ErrorJSON(w, 400, "Liquidity parameter must be positive", map[string]interface{}{
			"error_code": "INVALID_LIQUIDITY",
			"field":      "liquidity_param",
		})
		return
	}

	// ClosesAt validation (must be in future)
	now := time.Now().UTC()
	closesAtUTC := req.ClosesAt.UTC()

	if closesAtUTC.Before(now) {
		ErrorJSON(w, 400, "Market close time must be in the future", map[string]interface{}{
			"error_code": "INVALID_CLOSES_AT",
			"field":      "closes_at",
			"hint":       "Must be after current time",
		})
		return
	}

	// Minimum duration: 1 hour
	if closesAtUTC.Sub(now) < time.Hour {
		ErrorJSON(w, 400, "Market must be open for at least 1 hour", map[string]interface{}{
			"error_code": "DURATION_TOO_SHORT",
			"field":      "closes_at",
		})
		return
	}

	// ── Create market in database
	market, err := h.marketRepo.Create(r.Context(), repository.CreateMarketParams{
		Question:       req.Question,
		Description:    req.Description,
		ClosesAt:       closesAtUTC,
		LiquidityParam: req.LiquidityParam,
		CreatedBy:      adminID,
	})

	if err != nil {
		log.Printf("ERROR: Failed to create market: %v", err)
		ErrorJSON(w, 500, "Failed to create market", nil)
		return
	}

	// Log admin action
	log.Printf("ADMIN: User %s created market %s: %s", adminID, market.ID, req.Question)

	JSON(w, 201, market)
}

/*
OpenMarket transitions a market from PENDING to OPEN.

SECURITY:
  - Admin authentication required
  - Validates state transition (must be PENDING)
  - Creates AMM instance and loads into registry
  - Logs admin action

STATE MACHINE:

	PENDING → OPEN ✓
	OPEN → OPEN ✗ (idempotent, but logged)
	CLOSED → OPEN ✗
	RESOLVED → OPEN ✗
*/
func (h *MarketHandler) OpenMarket(w http.ResponseWriter, r *http.Request) {
	adminID := middleware.GetUserID(r)
	marketID := chi.URLParam(r, "marketID")

	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Fetch market
	market, err := h.marketRepo.GetByID(r.Context(), marketID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			ErrorJSON(w, 404, "Market not found", nil)
			return
		}
		log.Printf("mar_repo_get_fail: %w", err)
		ErrorJSON(w, 500, "Failed to fetch market", nil)
		return
	}

	// Validate state transition
	if market.Status == "OPEN" {
		log.Printf("ADMIN: User %s attempted to open already-open market %s", adminID, marketID)
		JSON(w, 200, map[string]string{
			"message": "Market already open",
			"status":  "OPEN",
		})
		return
	}

	if market.Status != "PENDING" {
		ErrorJSON(w, 400, "Market cannot be opened from current state", map[string]interface{}{
			"error_code":     "INVALID_STATE_TRANSITION",
			"current_status": market.Status,
			"hint":           "Only PENDING markets can be opened",
		})
		return
	}

	// ── Update market status
	err = h.marketRepo.UpdateStatus(r.Context(), marketID, "OPEN")
	if err != nil {
		log.Printf("ERROR: Failed to update market status: %v", err)
		ErrorJSON(w, 500, "Failed to open market", nil)
		return
	}

	// ── Initialize AMM

	// Convert liquidity param from cents to decimal
	// liquidityParamDecimal := float64(market.LiquidityParam) / 100.0
	liquidityParam := decimal.NewFromFloat(float64(market.LiquidityParam) / 100.0)

	ammMarket, err := h.registry.CreateMarket(amm.CreateMarketParams{
		ID:             marketID,
		Question:       market.Question,
		CreatedBy:      market.CreatedBy,
		LiquidityParam: liquidityParam,
		ClosesAt:       market.ClosesAt,
	})
	if err != nil {
		log.Printf("ERROR: Failed to create AMM instance: %v", err)
		// Rollback status update
		h.marketRepo.UpdateStatus(r.Context(), marketID, "PENDING")
		ErrorJSON(w, 500, "Failed to initialize market AMM", nil)
		return
	}

	// Open the market in AMM
	err = ammMarket.Open()
	if err != nil {
		log.Printf("ERROR: Failed to open AMM market: %v", err)
		ErrorJSON(w, 500, "Failed to open market in AMM", nil)
		return
	}

	// Log admin action
	log.Printf("ADMIN: User %s opened market %s", adminID, marketID)

	JSON(w, 200, map[string]string{
		"message": "Market opened successfully",
		"status":  "OPEN",
	})
}

/*
CloseMarket transitions a market from OPEN to CLOSED.

SECURITY:
  - Admin authentication required
  - Validates state transition (must be OPEN)
  - Stops accepting new trades
  - Logs admin action

STATE MACHINE:

	OPEN → CLOSED ✓
	PENDING → CLOSED ✗
	CLOSED → CLOSED ✗ (idempotent)
	RESOLVED → CLOSED ✗
*/
func (h *MarketHandler) CloseMarket(w http.ResponseWriter, r *http.Request) {
	adminID := middleware.GetUserID(r)
	marketID := chi.URLParam(r, "marketID")

	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Fetch market
	market, err := h.marketRepo.GetByID(r.Context(), marketID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			ErrorJSON(w, 404, "Market not found", nil)
			return
		}
		log.Printf("marrepo_get_fail: %w", err)
		ErrorJSON(w, 500, "Failed to fetch market", nil)
		return
	}

	// Validate state transition
	if market.Status == "CLOSED" {
		log.Printf("ADMIN: User %s attempted to close already-closed market %s", adminID, marketID)
		JSON(w, 200, map[string]string{
			"message": "Market already closed",
			"status":  "CLOSED",
		})
		return
	}

	if market.Status != "OPEN" {
		ErrorJSON(w, 400, "Market cannot be closed from current state", map[string]interface{}{
			"error_code":     "INVALID_STATE_TRANSITION",
			"current_status": market.Status,
			"hint":           "Only OPEN markets can be closed",
		})
		return
	}

	// ── Update market status
	err = h.marketRepo.UpdateStatus(r.Context(), marketID, "CLOSED")
	if err != nil {
		log.Printf("ERROR: Failed to update market status: %v", err)
		ErrorJSON(w, 500, "Failed to close market", nil)
		return
	}

	// ── Close AMM
	ammMarket, err := h.registry.GetMarket(marketID)
	if err != nil {
		log.Printf("that_amm_get_instance_err: %w", err)
	}
	if ammMarket != nil {
		err = ammMarket.Close()
		if err != nil {
			log.Printf("WARN: Failed to close AMM market: %v", err)
			// Continue anyway, database is source of truth
		}
	}

	// Log admin action
	log.Printf("ADMIN: User %s closed market %s", adminID, marketID)

	JSON(w, 200, map[string]string{
		"message": "Market closed successfully",
		"status":  "CLOSED",
	})
}

/*
ResolveMarket resolves a market and settles all positions.

REQUEST:

	{
	  "outcome": "YES"  // or "NO"
	}

SECURITY:
  - Admin authentication required
  - Validates state transition (must be CLOSED)
  - Cannot be reversed (final settlement)
  - All admin actions logged

STATE MACHINE:

	CLOSED → RESOLVED ✓
	PENDING → RESOLVED ✗
	OPEN → RESOLVED ✗ (must close first)
	RESOLVED → RESOLVED ✗ (immutable)

SETTLEMENT:
  - Winning shares: 100 cents each (1 KES)
  - Losing shares: 0 cents
  - PnL = payout - cost_basis
*/
func (h *MarketHandler) ResolveMarket(w http.ResponseWriter, r *http.Request) {
	adminID := middleware.GetUserID(r)
	marketID := chi.URLParam(r, "marketID")

	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Parse request
	var req struct {
		Outcome string `json:"outcome"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("err_req_validation: %w", err)
		ErrorJSON(w, 400, "Invalid request body", nil)
		return
	}

	// Validate outcome
	if req.Outcome != "YES" && req.Outcome != "NO" {
		ErrorJSON(w, 400, "Invalid outcome", map[string]interface{}{
			"error_code":     "INVALID_OUTCOME",
			"valid_outcomes": []string{"YES", "NO"},
		})
		return
	}

	// Fetch market
	market, err := h.marketRepo.GetByID(r.Context(), marketID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			ErrorJSON(w, 404, "Market not found", nil)
			return
		}
		log.Printf("err_getamr_repo: %w", err)
		ErrorJSON(w, 500, "Failed to fetch market", nil)
		return
	}

	// Validate state transition
	if market.Status == "RESOLVED" {
		ErrorJSON(w, 400, "Market already resolved", map[string]interface{}{
			"error_code":       "ALREADY_RESOLVED",
			"resolved_outcome": market.ResolvedOutcome,
			"hint":             "Resolution is immutable",
		})
		return
	}

	if market.Status != "CLOSED" {
		ErrorJSON(w, 400, "Market cannot be resolved from current state", map[string]interface{}{
			"error_code":     "INVALID_STATE_TRANSITION",
			"current_status": market.Status,
			"hint":           "Market must be CLOSED before resolution",
		})
		return
	}

	// ── Resolve market
	err = h.marketRepo.Resolve(r.Context(), marketID, req.Outcome, adminID)
	if err != nil {
		log.Printf("ERROR: Failed to resolve market: %v", err)
		ErrorJSON(w, 500, "Failed to resolve market", nil)
		return
	}

	// TODO: Settle positions (when position repository is ready)
	// For each position:
	//   - Calculate payout (winning_shares * 100 cents)
	//   - Calculate PnL (payout - cost_basis)
	//   - Credit user balance
	//   - Update position.realized_pnl

	// Log admin action (CRITICAL - this is auditable)
	log.Printf("ADMIN: User %s resolved market %s with outcome %s", adminID, marketID, req.Outcome)

	JSON(w, 200, map[string]interface{}{
		"message": fmt.Sprintf("Market resolved: %s", req.Outcome),
		"outcome": req.Outcome,
		"status":  "RESOLVED",
	})
}
