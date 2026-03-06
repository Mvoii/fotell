// fotell/api/repository/positions.go

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
positions.go — Position Repository

RESPONSIBILITIES:
  - Track user holdings in markets
  - Atomic position updates (buy/sell)
  - Calculate unrealized PnL
  - Settlement on market resolution

POSITION:
  - User owns YES shares and/or NO shares in a market
  - Cost basis tracks total spent
  - Unrealized PnL = current_value - cost_basis
  - Realized PnL = payout - cost_basis (after settlement)

FINANCIAL SAFETY:
  - Positions updated atomically with trades
  - Upsert pattern (create if not exists, update if exists)
  - Transaction support for atomicity
*/
type Position struct {
	UserID      string          `json:"user_id"`
	MarketID    string          `json:"market_id"`
	YesShares   decimal.Decimal `json:"yes_shares"`
	NoShares    decimal.Decimal `json:"no_shares"`
	CostBasis   int64           `json:"cost_basis"`   // total cost in cents
	RealizedPnL *int64          `json:"realized_pnl"` // after settlement (nullable)
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type UpsertPositionParams struct {
	UserID   string
	MarketID string
	Outcome  string          // YES or NO
	Shares   decimal.Decimal // shares to add
	Cost     int64           // cost in cents
}

type PositionRepository struct {
	db *sql.DB
}

func NewPositionRepository(db *sql.DB) *PositionRepository {
	return &PositionRepository{db: db}
}

//
// CREATE
//

/*
Upsert creates or updates a position (standalone, no transaction).

LOGIC:
  - If position doesn't exist: create it
  - If position exists: add shares and cost

For atomic trades, use UpsertTx instead
*/
func (r *PositionRepository) Upsert(ctx context.Context, params UpsertPositionParams) (*Position, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	position, err := r.UpsertTx(ctx, tx, params)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return position, nil
}

/*
UpsertTx creates or updates a position within a transaction.

ATOMICITY:
  - Uses PostgreSQL ON CONFLICT for upsert
  - Atomic with trade execution
  - No race conditions

USAGE:

	tx, _ := repo.BeginTx(ctx)
	defer tx.Rollback()

	position, err := repo.UpsertTx(ctx, tx, params)
	// ... other operations ...

	tx.Commit()
*/
func (r *PositionRepository) UpsertTx(ctx context.Context, tx *sql.Tx, params UpsertPositionParams) (*Position, error) {
	sharesFloat, _ := params.Shares.Float64()

	// determin which column to update based on outcome
	var query string
	if params.Outcome == "YES" {
		query = `
<<<<<<< HEAD
			INSERT INTO positions (
				user_id,
				market_id,
				yes_shares_smallest_unit,
				no_shares_smallest_unit,
				total_cost_basis_smallest_unit
			)
			VALUES ($1, $2, $3, 0, $4)
			ON CONFLICT (user_id, market_id) DO UPDATE SET
				yes_shares_smallest_unit = positions.yes_shares_smallest_unit + EXCLUDED.yes_shares_smallest_unit,
				total_cost_basis_smallest_unit = positions.total_cost_basis_smallest_unit + EXCLUDED.total_cost_basis_smallest_unit,
				updated_at = NOW()
			RETURNING user_id, market_id, yes_shares_smallest_unit, no_shares_smallest_unit, total_cost_basis_smallest_unit, realized_pnl_smallest_unit, created_at, updated_at
=======
			INSERT INTO position (
				user_id,
				market_id,
				yes_shares,
				no_shares,
				cost_basis_smalllest_unit
			)
			VALUES ($1, $2, $3, 0, $4)
			ON CONFLICT (user-id, market_id) DO UPDTE SET
				yes_shares = positions.yes_shares + EXCLUDED.yes_shares,
				cost_basis_smallest_unit = positions.cost_basis_smallest_unit + EXCLUSIDED.cost_basis_smallest_unit,
				updated_at = NOW()
			RETURNING user_id, market_id, yes_shares, no_shares, cost_basis_smallest_unit, realized_pnl_smallest_unit, created_at, updated_at
>>>>>>> 9804961 (lots of shit; trust the process)
		`
	} else {
		query = `
			INSERT INTO positions (
				user_id,
				market_id,
<<<<<<< HEAD
				yes_shares_smallest_unit,
				no_shares_smallest_unit,
				total_cost_basis_smallest_unit
			) VALUES ($1, $2, 0, $3, $4)
			ON CONFLICT (user_id, market_id) DO UPDATE SET
				no_shares_smallest_unit = positions.no_shares_smallest_unit + EXCLUDED.no_shares_smallest_unit,
				total_cost_basis_smallest_unit = positions.total_cost_basis_smallest_unit + EXCLUDED.total_cost_basis_smallest_unit,
				updated_at = NOW()
			RETURNING user_id, market_id, yes_shares_smallest_unit, no_shares_smallest_unit, total_cost_basis_smallest_unit, realized_pnl_smallest_unit, created_at, updated_at
=======
				yes_shares,
				no_shares,
				cost_basis_smallest_unit
			) VALUES ($1, $2, 0, $3, $4)
			ON CONFLICT (user_id, market_id) DO UPDATE SET
				no_shares = positions.no_sahres + EXCLUDED.no_shares,
				cost_basis_smallest_unit = position.cost_basis_smallest_unit + EXCLUDED.cost_basis_smallest_unit,
				updated_at = NOW()
			RETURNING user_id, market_id, no_shares, cost_basis_smallest_unit, realized_pnl_smallest_unit, created_at, updated_at
>>>>>>> 9804961 (lots of shit; trust the process)
		`
	}

	var position Position
	var yesSharesFloat, noSharesFloat float64

	err := tx.QueryRowContext(
		ctx,
		query,
		params.UserID,
		params.MarketID,
		sharesFloat,
		params.Cost,
	).Scan(
		&position.UserID,
		&position.MarketID,
		&yesSharesFloat,
		&noSharesFloat,
		&position.CostBasis,
		&position.RealizedPnL,
		&position.CreatedAt,
		&position.UpdatedAt,
	)

	if err != nil {
		log.Printf("ERROR: failed to upsert position: %v", err)
		return nil, fmt.Errorf("failed to upsert position: %w", err)
	}

	position.YesShares = decimal.NewFromFloat(yesSharesFloat)
	position.NoShares = decimal.NewFromFloat(noSharesFloat)

	return &position, nil
}

//
// READ
//

/*
GetByUserAndMarket retrieves a user's position in a specific market.

RETURNS:
  - Position record
  - ErrNotFound if no position exists
*/
func (r *PositionRepository) GetByUserAndMarket(ctx context.Context, userID, marketID string) (*Position, error) {
	query := `
<<<<<<< HEAD
		SELECT user_id, market_id, yes_shares_smallest_unit, no_shares_smallest_unit, total_cost_basis_smallest_unit, realized_pnl_smallest_unit, created_at, updated_at
=======
		SELECT user_id, market_id, yes_sahres, no_shares, cost_basis_smallest_unit, realized_pnl_smallest_unit, created_at, updated_at
>>>>>>> 9804961 (lots of shit; trust the process)
		FROM positions
		WHERE user_id = $1 AND market_id = $2
	`

	var position Position
	var yesSharesFloat, noSharesFloat float64

	err := r.db.QueryRowContext(ctx, query, userID, marketID).Scan(
		&position.UserID,
		&position.MarketID,
		&yesSharesFloat,
		&noSharesFloat,
		&position.CostBasis,
		&position.RealizedPnL,
		&position.CreatedAt,
		&position.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		log.Printf("ERROR: Failed to get position: %v", err)
		return nil, err
	}

	position.YesShares = decimal.NewFromFloat(yesSharesFloat)
	position.NoShares = decimal.NewFromFloat(noSharesFloat)

	return &position, nil
}

/*
ListByUser retrieves all positions for a user.

RETURNS:
  - Array of positions
  - Empty array if user has no positions
*/
func (r *PositionRepository) ListByUser(ctx context.Context, userID string) ([]*Position, error) {
	query := `
<<<<<<< HEAD
		SELECT user_id, market_id, yes_shares_smallest_unit, no_shares_smallest_unit, total_cost_basis_smallest_unit,
=======
		SELECT user_id, market_id, yes_shares, no_shares, cost_basis_smallest_unit,
>>>>>>> 9804961 (lots of shit; trust the process)
		       realized_pnl_smallest_unit, created_at, updated_at
		FROM positions
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		log.Printf("ERROR: Failed to query positions: %v", err)
		return nil, fmt.Errorf("failed to list positions: %w", err)
	}
	defer rows.Close()

	var positions []*Position
	for rows.Next() {
		var position Position
		var yesSharesFloat, noSharesFloat float64

		err := rows.Scan(
			&position.UserID,
			&position.MarketID,
			&yesSharesFloat,
			&noSharesFloat,
			&position.CostBasis,
			&position.RealizedPnL,
			&position.CreatedAt,
			&position.UpdatedAt,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan position: %v", err)
			return nil, fmt.Errorf("failed to scan position: %w", err)
		}

		position.YesShares = decimal.NewFromFloat(yesSharesFloat)
		position.NoShares = decimal.NewFromFloat(noSharesFloat)

		positions = append(positions, &position)
	}

	return positions, nil
}

/*
ListByMarket retrieves all positions in a market.

USAGE:
  - Leaderboard
  - Settlement (payout all users)
*/
func (r *PositionRepository) ListByMarket(ctx context.Context, marketID string) ([]*Position, error) {
	query := `
<<<<<<< HEAD
		SELECT user_id, market_id, yes_shares_smallest_unit, no_shares_smallest_unit, total_cost_basis_smallest_unit,
=======
		SELECT user_id, market_id, yes_shares, no_shares, cost_basis_smallest_unit,
>>>>>>> 9804961 (lots of shit; trust the process)
		       realized_pnl_smallest_unit, created_at, updated_at
		FROM positions
		WHERE market_id = $1
		ORDER BY cost_basis_smallest_unit DESC
	`

	rows, err := r.db.QueryContext(ctx, query, marketID)
	if err != nil {
		log.Printf("ERROR: Failed to query market positions: %v", err)
		return nil, fmt.Errorf("failed to list positions: %w", err)
	}
	defer rows.Close()

	var positions []*Position
	for rows.Next() {
		var position Position
		var yesSharesFloat, noSharesFloat float64

		err := rows.Scan(
			&position.UserID,
			&position.MarketID,
			&yesSharesFloat,
			&noSharesFloat,
			&position.CostBasis,
			&position.RealizedPnL,
			&position.CreatedAt,
			&position.UpdatedAt,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan position: %v", err)
			return nil, fmt.Errorf("failed to scan position: %w", err)
		}

		position.YesShares = decimal.NewFromFloat(yesSharesFloat)
		position.NoShares = decimal.NewFromFloat(noSharesFloat)

		positions = append(positions, &position)
	}

	return positions, nil
}

//
// settlement
//

/*
Settle calculates and records PnL for a position after market resolution.

LOGIC:
  - If outcome = YES: payout = yes_shares * 100 cents
  - If outcome = NO:  payout = no_shares * 100 cents
  - PnL = payout - cost_basis

USAGE:
  - Called when market resolves
  - Updates realized_pnl column
  - Credits user balance (separate operation)

PARAMETERS:
  - ctx: Context
  - tx: Transaction (must be part of settlement transaction)
  - userID: User UUID
  - marketID: Market UUID
  - outcome: Winning outcome (YES or NO)

RETURNS:
  - payout: Amount to credit user (in cents)
  - pnl: Profit/loss (in cents, can be negative)
  - error: Any error
*/
func (r *PositionRepository) SettleTx(ctx context.Context, tx *sql.Tx, userID, marketID, outcome string) (payout int64, pnl int64, err error) {
	// get position
	query := `
<<<<<<< HEAD
		SELECT yes_shares_smallest_unit, no_shares_smallest_unit, cost_basis_smallest_unit
		FROM positions
		WHERE user_id = $1 AND market_id = $2
		FOR UPDATE
=======
		SELECT yes_share, no_shares, cost_basis_smallest_unit
		FROM positions
		WHERE user_id, = $1 AND market_id = $2
		FOR UPDATE -- lock row for update
>>>>>>> 9804961 (lots of shit; trust the process)
	`

	var yesSharesFloat, noSharesFloat float64
	var costBasis int64

	err = tx.QueryRowContext(ctx, query, userID, marketID).Scan(
		&yesSharesFloat,
		&noSharesFloat,
		&costBasis,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("no rows to display: %v", err)
			return 0, 0, nil
		}

		return 0, 0, fmt.Errorf("failed to get position: %w", err)
	}

	// calc payout based on winning outcome
	// each winning share pays out 100 cents
	if outcome == "YES" {
		payout = int64(yesSharesFloat * 100)
	} else {
		payout = int64(noSharesFloat * 100)
	}

	pnl = payout - costBasis

	updatedQuery := `
		UPDATE positions
		SET realized_pnl_smallest_unit = $1,
		updated_at = NOW()
<<<<<<< HEAD
		WHERE user_id = $2 AND market_id = $3
=======
		WHERE user_id = $2 AND amrket_id = $3
>>>>>>> 9804961 (lots of shit; trust the process)
	`

	_, err = tx.ExecContext(ctx, updatedQuery, pnl, userID, marketID)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to update position %w", err)
	}

	return payout, pnl, nil
}
