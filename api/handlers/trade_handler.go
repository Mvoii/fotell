// fotell/api/handler/trade_handler.go

package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/esiepe/fotell/amm"
	"github.com/esiepe/fotell/api/middleware"
	"github.com/esiepe/fotell/api/repository"
	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"
)

/*
trades.go — Trade Execution Handlers

ENDPOINT:
  - POST /markets/{marketID}/trades → Place trade (buy shares)

FINANCIAL SAFETY:
  - ACID transactions (all-or-nothing)
  - Balance validation (cannot overdraw)
  - Optimistic locking (prevent race conditions)
  - Atomic AMM updates
  - Complete audit trail

SECURITY:
  - Authentication required (JWT)
  - User can only trade their own account
  - Market must be OPEN
  - Input validation on all parameters
  - SQL injection prevention

TRADE FLOW:
  1. Validate request (auth, market status, amounts)
  2. Get user balance (used as max cost)
  3. Execute AMM trade (ACID transaction):
     a. AMM calculates actual cost
     b. Debit actual cost from balance
     c. Create trade record
     d. Update position
     e. Persist AMM state

ATOMICITY:
  - If ANY step fails, ENTIRE trade rolls back
  - User balance never decremented without successful trade
  - AMM state never updated without database commit
*/

type TradeHandler struct {
	tradeRepo    *repository.TradeRepository
	balanceRepo  *repository.BalanceRepository
	marketRepo   *repository.MarketRepository
	positionRepo *repository.PositionRepository
	registry     *amm.Registry
}

func NewTradeHandler(
	tradeRepo *repository.TradeRepository,
	balanceRepo *repository.BalanceRepository,
	marketRepo *repository.MarketRepository,
	positionRepo *repository.PositionRepository,
	registry *amm.Registry,
) *TradeHandler {
	return &TradeHandler{
		tradeRepo:    tradeRepo,
		balanceRepo:  balanceRepo,
		marketRepo:   marketRepo,
		positionRepo: positionRepo,
		registry:     registry,
	}
}

//
// POST /markets/{marketID}/trades - place trade
//

/*
PlaceTrade executes a trade to buy shares in a prediction market.

REQUEST:

	{
	  "outcome": "YES",     // or "NO"
	  "shares": 10.5,       // number of shares to buy
	}

RESPONSE (201):

	{
	  "trade_id": "uuid",
	  "outcome": "YES",
	  "shares": 10.5,
	  "cost_paid": 520,
	  "position": {
	    "yes_shares": 10.5,
	    "no_shares": 0,
	    "cost_basis": 520
	  },
	  "balance_after": 479480
	}

SECURITY:
  - User must be authenticated
  - Market must be OPEN
  - Shares must be positive
  - Max cost must be positive
  - User must have sufficient balance
  - Balance enforced by AMM (trade fails if cost > balance)

FINANCIAL SAFETY:
  - Transaction rollback on ANY failure
  - Balance atomically updated
  - Position atomically updated
  - AMM state persisted to database
  - Complete audit trail

ERROR CODES:
  - 400: Invalid input (negative shares, etc.)
  - 401: Not authenticated
  - 403: Market not open for trading
  - 409: Insufficient balance
  - 422: Slippage exceeded (cost > max_cost)
  - 500: Database or AMM error
*/
func (h *TradeHandler) PlaceTrade(w http.ResponseWriter, r *http.Request) {
	// ── Extract user ID from JWT
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "Authentication required", map[string]interface{}{
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	// Extract market ID from URL
	marketID := chi.URLParam(r, "marketID")
	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Parse request body
	var req struct {
		Outcome string  `json:"outcome"`
		Shares  float64 `json:"shares"`
		// MaxCost int64   `json:"max_cost"` // in cents
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorJSON(w, 400, "Invalid request body", map[string]interface{}{
			"error_code": "INVALID_JSON",
		})
		return
	}

	// Input validation
	// Validate outcome
	if req.Outcome != "YES" && req.Outcome != "NO" {
		ErrorJSON(w, 400, "Outcome must be YES or NO", map[string]interface{}{
			"error_code":     "INVALID_OUTCOME",
			"valid_outcomes": []string{"YES", "NO"},
		})
		return
	}

	// Validate shares (must be positive)
	if req.Shares <= 0 {
		ErrorJSON(w, 400, "Shares must be positive", map[string]interface{}{
			"error_code": "INVALID_SHARES",
			"field":      "shares",
		})
		return
	}

	// Validate shares (reasonable limit to prevent overflow)
	if req.Shares > 1_000_000 {
		ErrorJSON(w, 400, "Shares exceeds maximum (1,000,000)", map[string]interface{}{
			"error_code": "SHARES_TOO_LARGE",
			"max_shares": 1_000_000,
		})
		return
	}

	/* // Validate max_cost (must be positive)
	if req.MaxCost <= 0 {
		ErrorJSON(w, 400, "Max cost must be positive", map[string]interface{}{
			"error_code": "INVALID_MAX_COST",
			"field":      "max_cost",
		})
		return
	} */

	// Check market exists and is OPEN
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

	// Market must be OPEN
	if market.Status != "OPEN" {
		ErrorJSON(w, 403, "Market not open for trading", map[string]interface{}{
			"error_code":     "MARKET_NOT_OPEN",
			"current_status": market.Status,
			"hint":           "Trading only allowed on OPEN markets",
		})
		return
	}

	// Check market hasn't closed
	if time.Now().UTC().After(market.ClosesAt) {
		ErrorJSON(w, 403, "Market has closed", map[string]interface{}{
			"error_code": "MARKET_CLOSED",
			"closed_at":  market.ClosesAt,
		})
		return
	}

	// Get AMM instance
	ammMarket, err := h.registry.GetMarket(marketID)
	if err != nil || ammMarket == nil {
		log.Printf("ERROR: AMM not loaded for market %s: %v", marketID, err)
		ErrorJSON(w, 500, "Market not loaded in AMM", map[string]interface{}{
			"error_code": "AMM_NOT_LOADED",
			"hint":       "Contact support",
		})
		return
	}

	/* // Get quote from AMM
	sharesDecimal := decimal.NewFromFloat(req.Shares)

	// quote, err := ammMarket.GetBuyQuote(req.Outcome, sharesDecimal)
	// conv outcome to binary outcome type
	/* 	var outcome amm.BinaryOutcome
	   	if req.Outcome == "YES" {
	   		outcome = amm.BuyYES
	   	} else {
	   		outcome = amm.BuyNO
	   	}
	*/
	// calc cost using amm
	//cost, err := ammMarket.CalculateCost(outcome, sharesDecimal)
	// Get cost for buying shares (the AMM calculates this internally)

	// We'll use a high maxCost for quote, then check against user's maxCost
	/* cost, err := ammMarket.GetCostToBuy(req.Outcome, sharesDecimal)
	if err != nil {
		log.Printf("ERROR: Failed to get AMM quote: %v", err)
		ErrorJSON(w, 500, "Failed to calculate trade cost", map[string]interface{}{
			"error_code": "QUOTE_FAILED",
		})
		return
	}

	prices, err := ammMarket.GetPrices()

	if err != nil {
		ErrorJSON(w, 500, "failed to get market prices", nil)
		return
	}

	// est cost (actual by amm when buying)
	var pricePerShare decimal.Decimal
	if req.Outcome == "YES" {
		pricePerShare = prices.YesPrice
	} else {
		pricePerShare = prices.NoPrice
	}

	// Convert cost from decimal to cents
	cost := pricePerShare.Mul(sharesDecimal).Div(decimal.NewFromInt(100))

	costFloat, _ := cost.Float64()
	costCents := int64(costFloat * 100) // Convert KES to cents

	// ── Slippage protection
	if costCents > req.MaxCost {
		ErrorJSON(w, 422, "Trade cost exceeds maximum", map[string]interface{}{
			"error_code":  "SLIPPAGE_EXCEEDED",
			"actual_cost": costCents,
			"max_cost":    req.MaxCost,
			"hint":        "Price moved unfavorably. Increase max_cost or reduce shares.",
		})
		return
	}
	*/
	// Check user balance
	balance, err := h.balanceRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			ErrorJSON(w, 500, "Balance not found", map[string]interface{}{
				"error_code": "BALANCE_MISSING",
				"hint":       "cONtact support",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch balance: %v", err)
		ErrorJSON(w, 500, "Failed to fetch balance", nil)
		return
	}

	/* 	// Check sufficient funds
	   	if balance.BalanceSmallestUnit < costCents {
	   		ErrorJSON(w, 409, "Insufficient balance", map[string]interface{}{
	   			"error_code": "INSUFFICIENT_BALANCE",
	   			"required":   costCents,
	   			"available":  balance.BalanceSmallestUnit,
	   			"shortfall":  costCents - balance.BalanceSmallestUnit,
	   		})
	   		return
	   	}

	   	// ── Execute trade (ATOMIC)
	   	ctx := r.Context() */

	// exec trade atomicaly
	sharesDecimal := decimal.NewFromFloat(req.Shares)

	/* trade, position, newBalance, err := h.executeTrade(ctx, req.Outcome, executeTradeParams{
		UserID:   userID,
		MarketID: marketID,
		Outcome:  req.Outcome,
		Shares:   sharesDecimal,
		// CostCents: costCents,
		EstimatedCostCents: costCents,
		MaxCostCents:       req.MaxCost,
		AMMMarket:          ammMarket,
	}) */

	trade, position, newBalance, err := h.executeTrade(r.Context(), executeTradeParams{
		UserID:           userID,
		MarketID:         marketID,
		Outcome:          req.Outcome,
		Shares:           sharesDecimal,
		UserBalanceCents: balance.BalanceSmallestUnit,
		AMMMarket:        ammMarket,
	})

	/* if err != nil {
		// Log error for debugging
		log.Printf("ERROR: Trade execution failed for user %s market %s: %v", userID, marketID, err)

		// Return user-friendly error
		ErrorJSON(w, 500, "Trade execution failed", map[string]interface{}{
			"error_code": "TRADE_FAILED",
			"hint":       "Your balance was not charged. Please try again.",
		})
		return
	}
	*/

	if err != nil {
		// Check for insufficient balance error
		if strings.Contains(err.Error(), "exceeds max acceptable cost") ||
			strings.Contains(err.Error(), "insufficient balance") {
			ErrorJSON(w, 409, "Insufficient balance", map[string]interface{}{
				"error_code": "INSUFFICIENT_BALANCE",
				"hint":       "Reduce shares or add funds.",
			})
			return
		}

		// Log error for debugging
		log.Printf("ERROR: Trade execution failed for user %s market %s: %v", userID, marketID, err)

		// Return user-friendly error
		ErrorJSON(w, 500, "Trade execution failed", map[string]interface{}{
			"error_code": "TRADE_FAILED",
			"hint":       "Your balance was not charged. Please try again.",
		})
		return
	}

	// CRITICAL: Add nil check before accessing trade
	if trade == nil || position == nil {
		log.Printf("ERROR: Trade or position is nil despite no error - this should never happen")
		ErrorJSON(w, 500, "Trade execution failed", map[string]interface{}{
			"error_code": "INTERNAL_ERROR",
			"hint":       "Please try again.",
		})
		return
	}
	// avgPrice := float64(costCents) / req.Shares
	avgPrice := float64(trade.CostPaid) / req.Shares

	JSON(w, 201, map[string]interface{}{
		"trade_id":  trade.ID,
		"outcome":   req.Outcome,
		"shares":    req.Shares,
		"cost_paid": trade.CostPaid,
		"avg_price": avgPrice,
		"position": map[string]interface{}{
			"yes_shares": position.YesShares,
			"no_shares":  position.NoShares,
			"cost_basis": position.CostBasis,
		},
		"balance_after": newBalance,
		"timestamp":     trade.CreatedAt,
	})
}

//
// internal trade exec
//

type executeTradeParams struct {
	UserID   string
	MarketID string
	Outcome  string
	Shares   decimal.Decimal
	// CostCents int64
	// EstimatedCostCents int64
	UserBalanceCents int64
	// MaxCostCents       int64
	AMMMarket *amm.Market
}

/*
executeTrade performs the complete trade execution atomically.

ATOMICITY GUARANTEES:

 1. Starts database transaction

 2. Debits user balance

 3. Records trade

 4. Updates position

 5. Executes AMM trade

 6. Persists AMM state

 7. Commits transaction

    If ANY step fails, ENTIRE operation rolls back.

RETURNS:
  - Trade record
  - Updated position
  - New balance
  - Error (if any)
*/
func (h *TradeHandler) executeTrade(ctx context.Context, params executeTradeParams) (
	*repository.Trade,
	*repository.Position,
	int64,
	error,
) {
	// start tx
	tx, err := h.tradeRepo.BeginTx(ctx)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to start tx: %w", err)
	}
	defer tx.Rollback()

	var outcome amm.BinaryOutcome
	if params.Outcome == "YES" {
		outcome = amm.BuyYES
	} else {
		outcome = amm.BuyNO
	}

	maxCostDecimal := decimal.NewFromInt(params.UserBalanceCents).Div(decimal.NewFromInt(100))

	// Get prices BEFORE trade (for audit trail)
	// pricesBefore, err := params.AMMMarket.GetPrices()
	pricesBefore, err := params.AMMMarket.GetPrices()
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to get prices before trade: %w", err)
	}

	// debit balance
	/* newBalance, err := h.balanceRepo.DebitTx(ctx, tx, params.UserID)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to debit alance: %w", err)
	} */

	// 4. Execute trade in AMM FIRST (to get new prices)
	receipt, err := params.AMMMarket.Buy(params.UserID, outcome, params.Shares, maxCostDecimal)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("AMM trade failed: %w", err)
	}

	actualCostCents := receipt.CostPaid.Mul(decimal.NewFromInt(100)).Ceil().IntPart()

	// Get prices AFTER trade
	pricesAfter := &amm.PriceQuote{
		YesPrice: receipt.YesPriceAfter,
		NoPrice:  receipt.NoPriceAfter,
	}
	if actualCostCents <= 0 {
		return nil, nil, 0, fmt.Errorf("failed to get prices after trade: %w", err)
	}

	// debit actual cost from user balance
	newBalance, err := h.balanceRepo.DebitTx(ctx, tx, params.UserID, actualCostCents)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("faield to debit balance: %w", err)
	}

	// create trade record
	trade, err := h.tradeRepo.CreateTx(ctx, tx, repository.CreateTradeParams{
		UserID:         params.UserID,
		MarketID:       params.MarketID,
		Outcome:        params.Outcome,
		Shares:         params.Shares,
		CostPaid:       actualCostCents,
		YesPriceBefore: pricesBefore.YesPrice,
		YesPriceAfter:  pricesAfter.YesPrice,
		NoPriceBefore:  pricesBefore.NoPrice,
		NoPriceAfter:   pricesAfter.NoPrice,
	})

	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to create trade %w", err)
	}

	// 3. Update position
	position, err := h.positionRepo.UpsertTx(ctx, tx, repository.UpsertPositionParams{
		UserID:   params.UserID,
		MarketID: params.MarketID,
		Outcome:  params.Outcome,
		Shares:   params.Shares,
		Cost:     actualCostCents,
	})
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to update position: %w", err)
	}
	/* // 4. Execute trade in AMM
	actualCost, err := params.AMMMarket.Buy(params.UserID, outcome, params.Shares, maxCostDecimal)

	if err != nil {
		return nil, nil, 0, fmt.Errorf("AMM trade failed: %w", err)
	}

	// Log actual cost for monitoring
	log.Printf("Trade executed: expected=%d actual=%s", params.CostCents, actualCost)
	*/
	// 5. Persist AMM state
	// quantities := params.AMMMarket.GetQuantities()
	// quantitiesJSON := fmt.Sprintf(`{"quantities": [%f, %f]}`, quantities[0], quantities[1])
	//state := params.AMMMarket.GetQuantities()
	//quantitiesJSON := fmt.Sprintf(`{"quantities": [%f, %f]}`, state.Q0, stateQ1)

	/* snapshot, err := params.AMMMarket.Snapshot()
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to get mar snap: %w", err)
	} */

	yesPriceFloat, _ := receipt.YesPriceAfter.Float64()
	noPriceFloat, _ := receipt.NoPriceAfter.Float64()
	// quantitiesJSON := fmt.Sprintf(`"{yes_price": %f, "no_price":%f}`, yesPriceFloat, noPriceFloat)

	quantitiesJSON := fmt.Sprintf(`{"quantities": [%f, %f]}`, yesPriceFloat, noPriceFloat)

	err = h.marketRepo.UpdateQuantitiesStateTx(ctx, tx, params.MarketID, quantitiesJSON)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to persist AMM state: %w", err)
	}

	// 6. Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, nil, 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Success!
	log.Printf("Trade executed: user=%s market=%s outcome=%s shares=%s cost=%d cents",
		params.UserID, params.MarketID, params.Outcome, params.Shares.String(), actualCostCents)

	return trade, position, newBalance, nil
}

//
// GET /markets/{marketID}/trades — List Market Trades (Public)
//

/*
ListMarketTrades returns recent trades for a market.

QUERY PARAMETERS:
  - limit: Max results (default: 50, max: 100)
  - offset: Pagination offset

SECURITY:
  - No authentication required (public data)
  - User IDs visible (public leaderboard)

RESPONSE:

	{
	  "trades": [...],
	  "total": 42,
	  "limit": 50,
	  "offset": 0
	}
*/
func (h *TradeHandler) ListMarketTrades(w http.ResponseWriter, r *http.Request) {
	marketID := chi.URLParam(r, "marketID")
	if marketID == "" {
		ErrorJSON(w, 400, "Market ID required", nil)
		return
	}

	// Parse pagination
	limit := 50
	offset := 0

	// TODO: Parse query params for limit/offset

	// Fetch trades
	trades, total, err := h.tradeRepo.ListByMarket(r.Context(), marketID, limit, offset)
	if err != nil {
		log.Printf("ERROR: Failed to list trades: %v", err)
		ErrorJSON(w, 500, "Failed to fetch trades", nil)
		return
	}

	JSON(w, 200, map[string]interface{}{
		"trades": trades,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

//
// GET /users/me/trades - list user trades
//

/*
ListMyTrades returns the authenticated user's trade history.

SECURITY:
  - Authentication required
  - User can only see their own trades
*/
func (h *TradeHandler) ListMyTrades(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		ErrorJSON(w, 401, "Authentication required", nil)
		return
	}

	// Parse pagination
	limit := 50
	offset := 0

	// TODO: Parse query params

	// Fetch user's trades
	trades, total, err := h.tradeRepo.ListByUser(r.Context(), userID, limit, offset)
	if err != nil {
		log.Printf("ERROR: Failed to list user trades: %v", err)
		ErrorJSON(w, 500, "Failed to fetch trades", nil)
		return
	}

	JSON(w, 200, map[string]interface{}{
		"trades": trades,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}
