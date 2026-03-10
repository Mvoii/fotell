// fotell/api/repository/trades.go

package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/shopspring/decimal"
)

/*
trades.go — Trade Repository

RESPONSIBILITIES:
  - Create trade records (immutable audit trail)
  - Query trades by user, market, time
  - Transaction support for atomic operations
  - Complete audit trail

FINANCIAL SAFETY:
  - Trades are immutable (INSERT only, never UPDATE/DELETE)
  - Every trade recorded with timestamp
  - User ID, market ID, cost all logged
  - Transaction support for atomicity
*/

type Trade struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id"`
	MarketID  string          `json:"market_id"`
	Outcome   string          `json:"outcome"` // YES or NO
	Shares    decimal.Decimal `json:"shares"`
	CostPaid  int64           `json:"cost_paid"` // in cents
	CreatedAt time.Time       `json:"created_at"`
}

type CreateTradeParams struct {
	UserID         string
	MarketID       string
	Outcome        string
	Shares         decimal.Decimal
	CostPaid       int64
	YesPriceBefore decimal.Decimal
	YesPriceAfter  decimal.Decimal
	NoPriceBefore  decimal.Decimal
	NoPriceAfter   decimal.Decimal
}

type TradeRepository struct {
	db *sql.DB
}

func NewTradeRepository(db *sql.DB) *TradeRepository {
	return &TradeRepository{db: db}
}

//
// TX
//

/*
BeginTx starts a database transaction

Usage:

	 	tx, err := repo.BeginTx(ctx)
		defer tx.Rollback()

		...

		tx.Commit()
*/
func (r *TradeRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelReadCommitted,
	})
}

//
// create
//

/*
Create inserts a trade record (standalone, no tx)

IMMUTABLE:
  - Trades are never updated or deleted
  - Complete audit trail

For atomic trades, use CreateTx instead
*/
func (r *TradeRepository) Create(ctx context.Context, params CreateTradeParams) (*Trade, error) {
	query := `
		INSERT INTO trades (
			user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit,
			yes_price_before, yes_price_after, no_price_before, no_price_after
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit, created_at
	`

	var trade Trade
	sharesFloat, _ := params.Shares.Float64()
	yesPriceBefore, _ := params.YesPriceBefore.Float64()
	yesPriceAfter, _ := params.YesPriceAfter.Float64()
	noPriceBefore, _ := params.NoPriceBefore.Float64()
	noPriceAfter, _ := params.NoPriceAfter.Float64()

	err := r.db.QueryRowContext(
		ctx,
		query,
		params.UserID,
		params.MarketID,
		params.Outcome,
		sharesFloat,
		params.CostPaid,
		yesPriceBefore,
		yesPriceAfter,
		noPriceBefore,
		noPriceAfter,
	).Scan(
		&trade.ID,
		&trade.UserID,
		&trade.MarketID,
		&trade.Outcome,
		&trade.Shares,
		&trade.CostPaid,
		&trade.CreatedAt,
	)

	if err != nil {
		log.Printf("ERROR: Failed to create trade: %v", err)
		return nil, fmt.Errorf("failed to create trade: %w", err)
	}

	return &trade, nil
}

/*
CreateTx inserts a trade record within a tx

ATOMICITY:
  - Part of larger atomic ops
  - Rolls back with tx if any steps fail

USAGE:

	tx, _ := repo.BeginTx(ctx)
	defer tx.Rollback()

	trade, err := repo.Create(ctx, tx, params)
	...
	tx.Commit()
*/
func (r *TradeRepository) CreateTx(ctx context.Context, tx *sql.Tx, params CreateTradeParams) (*Trade, error) {
	query := `
		INSERT INTO trades (
			user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit,
			yes_price_before, yes_price_after, no_price_before, no_price_after
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit, created_at
	`

	var trade Trade
	sharesFloat, _ := params.Shares.Float64()
	yesPriceBefore, _ := params.YesPriceBefore.Float64()
	yesPriceAfter, _ := params.YesPriceAfter.Float64()
	noPriceBefore, _ := params.NoPriceBefore.Float64()
	noPriceAfter, _ := params.NoPriceAfter.Float64()

	err := tx.QueryRowContext(
		ctx,
		query,
		params.UserID,
		params.MarketID,
		params.Outcome,
		sharesFloat,
		params.CostPaid,
		yesPriceBefore,
		yesPriceAfter,
		noPriceBefore,
		noPriceAfter,
	).Scan(
		&trade.ID,
		&trade.UserID,
		&trade.MarketID,
		&trade.Outcome,
		&trade.Shares,
		&trade.CostPaid,
		&trade.CreatedAt,
	)

	if err != nil {
		log.Printf("ERROR: failed to create trade in tx: %v", err)
		return nil, fmt.Errorf("failed to create trade: %w", err)
	}

	return &trade, nil
}

//
// READ
//

/*
GetByID retrieves a trade by ID

RETURNS:
  - Trade record
  - ErrNotFound if doesn't exist
*/
func (r *TradeRepository) GetByID(ctx context.Context, id string) (*Trade, error) {
	query := `
		SELECT id, user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit, created_at
		FROM trades
		WHERE id = $1
	`

	var trade Trade
	var sharesFloat float64

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&trade.ID,
		&trade.UserID,
		&trade.MarketID,
		&trade.Outcome,
		&sharesFloat,
		&trade.CostPaid,
		&trade.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		log.Printf("ERROR: get by id: %v", err)
		return nil, err
	}

	trade.Shares = decimal.NewFromFloat(sharesFloat)
	return &trade, nil
}

/*
ListByUserAndMarket retrieves trades for a user in a specific market.

USAGE:
  - Show user their trades in a market
  - Calculate user's position
*/
func (r *TradeRepository) ListByUserAndMarket(ctx context.Context, userID, marketID string) ([]*Trade, error) {
	query := `
		SELECT id, user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit, created_at
		FROM trades
		WHERE user_id = $1 AND market_id = $2
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID, marketID)
	if err != nil {
		log.Printf("ERROR: Failed to query user-market trades: %v", err)
		return nil, fmt.Errorf("failed to list trades: %w", err)
	}
	defer rows.Close()

	var trades []*Trade
	for rows.Next() {
		var trade Trade
		var sharesFloat float64

		err := rows.Scan(
			&trade.ID,
			&trade.UserID,
			&trade.MarketID,
			&trade.Outcome,
			&sharesFloat,
			&trade.CostPaid,
			&trade.CreatedAt,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan trade: %v", err)
			return nil, fmt.Errorf("failed to scan trade: %w", err)
		}

		trade.Shares = decimal.NewFromFloat(sharesFloat)
		trades = append(trades, &trade)
	}

	return trades, nil
}

/*
ListByMarket retrieves trades for a specific market.

PARAMETERS:
  - marketID: Market UUID
  - limit: Max results
  - offset: Pagination offset
*/
func (r *TradeRepository) ListByMarket(ctx context.Context, marketID string, limit, offset int) ([]*Trade, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM trades WHERE market_id = $1`
	err := r.db.QueryRowContext(ctx, countQuery, marketID).Scan(&total)
	if err != nil {
		log.Printf("ERROR: Failed to count trades: %v", err)
		return nil, 0, fmt.Errorf("failed to count trades: %w", err)
	}

	// Get trades
	query := `
		SELECT id, user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit, created_at
		FROM trades
		WHERE market_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, marketID, limit, offset)
	if err != nil {
		log.Printf("ERROR: Failed to query trades: %v", err)
		return nil, 0, fmt.Errorf("failed to list trades: %w", err)
	}
	defer rows.Close()

	var trades []*Trade
	for rows.Next() {
		var trade Trade
		var sharesFloat float64

		err := rows.Scan(
			&trade.ID,
			&trade.UserID,
			&trade.MarketID,
			&trade.Outcome,
			&sharesFloat,
			&trade.CostPaid,
			&trade.CreatedAt,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan trade: %v", err)
			return nil, 0, fmt.Errorf("failed to scan trade: %w", err)
		}

		trade.Shares = decimal.NewFromFloat(sharesFloat)
		trades = append(trades, &trade)
	}

	return trades, total, nil
}

/*
ListByUser retrieves all trades for a specific user.
*/
func (r *TradeRepository) ListByUser(ctx context.Context, userID string, limit, offset int) ([]*Trade, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM trades WHERE user_id = $1`
	err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		log.Printf("ERROR: Failed to count user trades: %v", err)
		return nil, 0, fmt.Errorf("failed to count trades: %w", err)
	}

	// Get trades
	query := `
		SELECT id, user_id, market_id, outcome, shares_bought_smallest_unit, cost_paid_smallest_unit, created_at
		FROM trades
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		log.Printf("ERROR: Failed to query user trades: %v", err)
		return nil, 0, fmt.Errorf("failed to list trades: %w", err)
	}
	defer rows.Close()

	var trades []*Trade
	for rows.Next() {
		var trade Trade
		var sharesFloat float64

		err := rows.Scan(
			&trade.ID,
			&trade.UserID,
			&trade.MarketID,
			&trade.Outcome,
			&sharesFloat,
			&trade.CostPaid,
			&trade.CreatedAt,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan trade: %v", err)
			return nil, 0, fmt.Errorf("failed to scan trade: %w", err)
		}
		trade.Shares = decimal.NewFromFloat(sharesFloat)
		trades = append(trades, &trade)
	}

	return trades, total, nil
}
