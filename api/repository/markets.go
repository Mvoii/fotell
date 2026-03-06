// fotell/api/repository/markets.go

package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"
)

/*
markket.go - Market repo

RESPONSIBILITIES:
 - CRUD ops for markets table
 - State machine enforcement
 - Market quantities persistence (AMM state)
 - Tansaction safety for state changes

 STATE MACHINE:
 - PENDING -> OPEN -> CLOSED -> REOSLVED

 Each tx is validated and atomic
 Resolved markets are immutable
*/

var ErrNotFound = errors.New("not found")
var ErrInvalidStateTransition = errors.New("invalid state transition")

type Market struct {
	ID              string     `json:"id"`
	Question        string     `json:"question"`
	Description     string     `json:"description"`
	Status          string     `json:"status"`
	LiquidityParam  int64      `json:"liquidity_param"` // in cents
	YesPrice        *float64   `json:"yes_price,omitempty"`
	NoPrice         *float64   `json:"no_price,omitempty"`
	CreatedBy       string     `json:"created_by"`
	CreatedAt       time.Time  `json:"created_at"`
	ClosesAt        time.Time  `json:"closes_at"`
	ResolvedOutcome *string    `json:"resolved_outcome,omitempty"`
	ResolvedBy      *string    `json:"resolved_by,omitempty"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	UpdatedAt       time.Time  `json:"updated_at"`

	QuantitiesState *string `json:"quantities_state,omitempty"` // JSON: {"quantities: [q0, q1]"}
}

type CreateMarketParams struct {
	Question       string
	Description    string
	ClosesAt       time.Time
	LiquidityParam int64
	CreatedBy      string
}

type MarketRepository struct {
	db *sql.DB
}

func NewMarketRepository(db *sql.DB) *MarketRepository {
	return &MarketRepository{db: db}
}

//
// CREATE
//

/*
Create inserts a new market with pending status

VALIDATION:
  - Question: 1-500 chars
  - LiquidityParam: > 0
  - ClosesAt: in the future

INITIAL STATE:
  - Status: PENDING
  - Admin must call Open() to start trading
*/
func (r *MarketRepository) Create(ctx context.Context, params CreateMarketParams) (*Market, error) {
	query := `
		INSERT INTO markets (
			question,
			description,
			liquidity_param_smallest_unit,
			closes_at,
			created_by
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id, question, description, status, liquidity_param_smallest_unit, created_by, created_at, closes_at, updated_at
	`

	var market Market
	err := r.db.QueryRowContext(
		ctx,
		query,
		params.Question,
		params.Description,
		params.LiquidityParam,
		params.ClosesAt,
		params.CreatedBy,
	).Scan(
		&market.ID,
		&market.Question,
		&market.Description,
		&market.Status,
		&market.LiquidityParam,
		&market.CreatedBy,
		&market.CreatedAt,
		&market.ClosesAt,
		&market.UpdatedAt,
	)

	if err != nil {
		log.Printf("failed to create market: %v", err)
		return nil, fmt.Errorf("failed to create market: %w", err)
	}

	return &market, nil
}

//
// READ
//

/*
GetByID retreived a market by ID

RETURNS:
  - Market with all fields
  - ErrNotFound if does not exist
*/
func (r *MarketRepository) GetByID(ctx context.Context, id string) (*Market, error) {
	query := `
		SELECT
			id, question, description, status, liquidity_param_smallest_unit, created_by, created_at, closes_at, updated_at, resolved_outcome, resolved_by, resolved_at, quantities_state
		FROM markets
		WHERE id = $1
	`

	var market Market
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&market.ID,
		&market.Question,
		&market.Description,
		&market.Status,
		&market.LiquidityParam,
		&market.CreatedBy,
		&market.CreatedAt,
		&market.ClosesAt,
		&market.UpdatedAt,
		&market.ResolvedOutcome,
		&market.ResolvedBy,
		&market.ResolvedAt,
		&market.QuantitiesState,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("mar_get_by_id_fail: %w", err)
			return nil, ErrNotFound
		}

		log.Printf("mar_get_by_id_fail_not_sql: %w", err)
		return nil, err
	}

	return &market, nil
}

/*
List retrieves markets with optional filtering and pegination

PARAMS:
  - status: Filter by status (empty = all)
  - limit: Max results
  - offset: pagination offset

RETURNS:
  - markets: array of markets
  - total: total count for pagination
  - error: any db err
*/
func (r *MarketRepository) List(ctx context.Context, status string, limit int, offset int) ([]*Market, int, error) {
	// build query with oprional filter
	var query string
	var countQuery string
	var args []interface{}

	if status != "" {
		query = `
			SELECT
				id, question, description, status, liquidity_param_smallest_unit,
				created_by, created_at, closes_at, updated_at, resolved_outcome, resolved_by, resolved_at
			FROM markets
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		countQuery = `SELECT COUNT(*) FROM markets WHERE status = $1`
		args = []interface{}{status, limit, offset}
	} else {
		query = `
			SELECT
				id, question, description, status, liquidity_param_smallest_unit,
				created_by, created_at, closes_at, updated_at, resolved_outcome, resolved_by, resolved_at
			FROM markets
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		countQuery = `SELECT COUNT(*) FROM markets`
		args = []interface{}{limit, offset}
	}

	// get total count
	var total int
	/*
		countArgs := args[:len(args)-2] // remove lim and off for count
		if len(countArgs) == 0 {
			countArgs = []interface{}{}
		} */
	var countArgs []interface{}
	if status != "" {
		countArgs = []interface{}{status}
	} else {
		countArgs = []interface{}{}
	}

	err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		log.Printf("mar_cnt_failed: %w", err)
		return nil, 0, fmt.Errorf("failed to count markets: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		log.Printf("row_query_err: %w", err)
		return nil, 0, fmt.Errorf("failed to list markets: %w", err)
	}
	defer rows.Close()

	var markets []*Market
	for rows.Next() {
		var market Market
		err := rows.Scan(
			&market.ID,
			&market.Question,
			&market.Description,
			&market.Status,
			&market.LiquidityParam,
			&market.CreatedBy,
			&market.CreatedAt,
			&market.ClosesAt,
			&market.UpdatedAt,
			&market.ResolvedOutcome,
			&market.ResolvedBy,
			&market.ResolvedAt,
		)
		if err != nil {
			log.Printf("mar_scan_err: %w", err)
			return nil, 0, fmt.Errorf("failed to scan market: %w", err)
		}
		markets = append(markets, &market)
	}

	return markets, total, nil
}

//
// UPDATE (state machine)
//

/*
UpdateStatus transitions a market to a new status

VALIDATION:
  - enforces state machine rules
  - Atimic update with timestamp

STATE TRANSITIONS:
  - PENDING -> OPEN
  - OPEN -> CLOSED
  - CLOSED -> RESOLVED (via Resolve, not this method)
*/
func (r *MarketRepository) UpdateStatus(ctx context.Context, id string, newStatus string) error {
	query := `
		UPDATE markets
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING status
	`

	var updatedStatus string
	err := r.db.QueryRowContext(ctx, query, newStatus, id).Scan(&updatedStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("sql_scan_err: %v Err: %w", ErrNotFound, err)
			return ErrNotFound
		}

		log.Printf("update_err_not_sql: %w", err)
		return fmt.Errorf("failed to update the market status: %w", err)
	}
	return nil
}

/*
Resolve resolves a market wwith an outcome

ATOMICITY:
  - Update status to RESOLVED
  - sets resolved_outcome, resolved_by, resolved_at
  - Single transition

IMMUTABLE:
  - once resolved, cannot be changed
  - Enforced by database contratints
*/
func (r *MarketRepository) Resolve(ctx context.Context, id string, outcome string, resolvedBy string) error {
	query := `
		UPDATE markets
		SET
			status = 'RESOLVED',
			resolved_outcome = $1,
			resolved_by = $2,
			resolved_at = NOW(),
			updated_at = NOW()
		WHERE id = $3 AND status = 'CLOSED'
		RETURNING id
	`

	var returnedID string
	err := r.db.QueryRowContext(ctx, query, outcome, resolvedBy, id).Scan(&returnedID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// mar not exists or not closed
			//c heck if mar exists
			var exists bool
			checkQuery := `SELECT EXISTS(SELECT 1 FROM markets WHERE id = $1)`
			r.db.QueryRowContext(ctx, checkQuery, id).Scan(&exists)

			if !exists {
				log.Printf("mar_not_found: %w", ErrNotFound)
				return ErrNotFound
			}

			log.Printf("err: %w", ErrInvalidStateTransition)
			return ErrInvalidStateTransition
		}

		log.Printf("mar_resolve_err: %w", err)
		return fmt.Errorf("failed to resolved market: %w", err)
	}

	return nil
}

//
// AMM state persistence
//

/*
UpdateQuantitiesState persists AMM state to database

CRITICAL FOR PROD:
  - called after every trade
  - Ensures AMM state survives server restarts
  - Stored as JSONB for efficient querying

USAGE:
  - quantities := market.GetQuantities() // [q0, q1]
  - json ;=fmt.Sprintf(`{"quantities": [%f, %f]}`, quantities[0], quantities[1])
  - err := repo.UpdateQuantitiesState(ctx, marketID, json)
*/
func (r *MarketRepository) UpdateQuantitiesState(ctx context.Context, id string, quantitiesJSON string) error {
	query := `
		UPDATE markets
		SET quantities_state = $1::jsonb, updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.ExecContext(ctx, query, quantitiesJSON, id)
	if err != nil {
		log.Printf("quantity_update_state_fail: %w", err)
		return fmt.Errorf("failed to update quantities state: %w", err)
	}

	return nil
}

/*
GetAllActive retrieves all OPEN markets

USAGE:
  - Server startup: load all active markets into AMM registry
  - Scheduled jobs: sync AMM state with db

RETURNS:
  - Markets with status = "OPEN"
  - Includes quantities_state for AMM reconstruction
*/
func (r *MarketRepository) GetAllActive(ctx context.Context) ([]*Market, error) {
	query := `
		SELECT
			id, question, description, status, liquidity_param_smallest_unit, created_by, created_at, closes_at, updated_at, quantities_state
		FROM markets
		WHERE status = 'OPEN'
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("get_active_mar_err: %w", err)
		return nil, fmt.Errorf("failed to get active markets: %w", err)
	}
	defer rows.Close()

	var markets []*Market
	for rows.Next() {
		var market Market
		err := rows.Scan(
			&market.ID,
			&market.Question,
			&market.Description,
			&market.Status,
			&market.LiquidityParam,
			&market.CreatedBy,
			&market.CreatedAt,
			&market.ClosesAt,
			&market.UpdatedAt,
			&market.QuantitiesState,
		)
		if err != nil {
			log.Printf("scan_mar_err: %w", err)
			return nil, fmt.Errorf("failed to scan market: %w", err)
		}
		markets = append(markets, &market)
	}

	return markets, nil
}
