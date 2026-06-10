// fotell/api/workers/settlement_worker.go

package workers

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/lib/pq"
)

/*
settlement_worer.go - Settlement background workers

ARCHI:
 - Two workers run in separate goroutines

 1. SettlementStagerWorker (every 30s):
	- Calls stage_settlements() Postgres function
	- Stages winning trades for settlement

 2. SettlementExecutionerWorker (every 30s):
	- Calls execute_settlememnts() Postgres function
	- Pays users and creates audit records

 3. SettlementJanitorWorker (every hour)
	- Calls cleanup_staged_settlements() Postgres fucntion
	- remove old completed staging records

SAFETY:
 - Each minion runs indie
 - Database functions handle all logic
 - Graceful shutdown via cotext cancellation
 - Error logging and retry logic
*/

type SettlementMinion struct {
	db *sql.DB
}

func NewSettlementMinon(db *sql.DB) *SettlementMinion {
	return &SettlementMinion{db: db}
}

/*
Start launches all settlement minions

USAGE:

	settlementMinion :== workers.NewSettlementMinion(db)
	ctx, cancel ;= context.WithCancel(context.Background())
	defer cancel()

	setllementMinion.Start(ctx)
*/
func (w *SettlementMinion) Start(ctx context.Context) {
	log.Println("Settlement workers starting...")

	go w.Stager(ctx)

	go w.Executioner(ctx)

	go w.Janitor(ctx)

	log.Println("minions started")
}

/*
Stager runs the stager func every 30s

FUNCTION:
  - Finds recently resolved markets
  - Stages winning trades for settlement
  - Update Pending -> Ready when 5 min delay expires
*/
func (w *SettlementMinion) Stager(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	log.Println("stager minion started (30s)")

	w.runStage(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("stager minion shutting down...")
			return
		case <-ticker.C:
			w.runStage(ctx)
		}
	}
}

func (w *SettlementMinion) runStage(ctx context.Context) {
	query := `SELECT * FROM stage_settlements()`

	var marketsProcessed, tradesStaged int
	err := w.db.QueryRowContext(ctx, query).Scan(&marketsProcessed, &tradesStaged)

	if err != nil {
		log.Printf("stager err: %v", err)
		return
	}
	if marketsProcessed > 0 || tradesStaged > 0 {
		log.Printf("stager: %d markets, %d trades staged", marketsProcessed, tradesStaged)
	} else {
		log.Printf("Stager: 0 trades ready to stage")
	}
}

/*
Executioner runs teh executor function every 30s

FUNCTION:
  - Finds ready settlements (>5 min since resolution)
  - Agregates trades by user
  - Pays users and creates audit records
  - Moves to settlement_executed table
*/
func (w *SettlementMinion) Executioner(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	log.Println("executioner minion started")

	w.runExecution(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("executioner minion shutting down...")
			return
		case <-ticker.C:
			w.runExecution(ctx)
		}
	}
}

func (w *SettlementMinion) runExecution(ctx context.Context) {
	// 1. Fetch all READY staged settlements with row-level locking
	rows, err := w.db.QueryContext(ctx, `
		SELECT 
			id, 
			trade_id,
			market_id, 
			user_id, 
			shares_won, 
			cost_paid_cents, 
			resolved_outcome,
			market_resolved_at
		FROM settlement_staged 
		WHERE status = 'READY' 
		ORDER BY market_resolved_at ASC, market_id, user_id
		LIMIT 100
		FOR UPDATE SKIP LOCKED
	`)
	if err != nil {
		log.Printf("Executioner: Error fetching staged rows: %v", err)
		return
	}
	defer rows.Close()

	type stagedRow struct {
		id               string
		tradeID          string
		marketID         string
		userID           string
		sharesWon        float64
		costPaidCents    int64
		resolvedOutcome  string
		marketResolvedAt time.Time
	}

	var allRows []stagedRow
	for rows.Next() {
		var r stagedRow
		if err := rows.Scan(
			&r.id,
			&r.tradeID,
			&r.marketID,
			&r.userID,
			&r.sharesWon,
			&r.costPaidCents,
			&r.resolvedOutcome,
			&r.marketResolvedAt,
		); err != nil {
			log.Printf("Executioner: Scan error: %v", err)
			return
		}
		allRows = append(allRows, r)
	}

	if len(allRows) == 0 {
		log.Printf("Executioner: 0 settlements ready")
		return
	}

	// 2. Group by User + Market + Outcome
	type groupKey struct {
		marketID   string
		userID     string
		outcome    string
		resolvedAt time.Time
	}
	groups := make(map[groupKey][]stagedRow)
	for _, r := range allRows {
		key := groupKey{r.marketID, r.userID, r.resolvedOutcome, r.marketResolvedAt}
		groups[key] = append(groups[key], r)
	}

	// 3. Process each group as a separate transaction
	var tradesProcessed, usersPaid int
	var totalPayoutCents int64

	for key, groupRows := range groups {
		var groupPayout, groupCost int64
		var groupShares float64
		var stagedIDs, tradeIDs []string
		var shares []float64
		var costs []int64

		for _, r := range groupRows {
			sharePayout := int64(r.sharesWon * 100)
			groupPayout += sharePayout // Payout is 100 cents per share
			groupCost += r.costPaidCents
			groupShares += r.sharesWon
			stagedIDs = append(stagedIDs, r.id)
			tradeIDs = append(tradeIDs, r.tradeID)
			shares = append(shares, r.sharesWon)
			costs = append(costs, r.costPaidCents)
		}

		err := w.processSettlement(ctx,
			key.userID,
			key.marketID,
			key.outcome,
			key.resolvedAt,
			stagedIDs,
			tradeIDs,
			shares,
			costs,
			groupShares,
			groupCost,
			groupPayout,
		)
		if err != nil {
			log.Printf("Executioner: Failed to process user %s for market %s: %v", key.userID, key.marketID, err)
			// Continue with next group - don't stop all settlements
			continue
		}

		tradesProcessed += len(stagedIDs)
		usersPaid++
		totalPayoutCents += groupPayout
	}

	if usersPaid > 0 {
		log.Printf("Executioner: %d trades, %d users, KES %.2f paid",
			tradesProcessed, usersPaid, float64(totalPayoutCents)/100.0)
	}
}

func (w *SettlementMinion) processSettlement(
	ctx context.Context,
	userID string,
	marketID string,
	outcome string,
	marketResolvedAt time.Time,
	stagedIDs []string,
	tradeIDs []string,
	shares []float64,
	costs []int64,
	totalShares float64,
	totalCost int64,
	totalPayout int64,
) error {
	// Start transaction
	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Mark staged rows as PROCESSING (prevents double-processing)
	_, err = tx.ExecContext(ctx,
		"UPDATE settlement_staged SET status = 'PROCESSING' WHERE id = ANY($1)",
		pq.Array(stagedIDs),
	)
	if err != nil {
		return fmt.Errorf("failed to mark as PROCESSING: %w", err)
	}

	// 2. Lock and get current balance
	var balanceBefore int64
	err = tx.QueryRowContext(ctx,
		"SELECT balance_smallest_unit FROM balances WHERE user_id = $1 FOR UPDATE",
		userID,
	).Scan(&balanceBefore)
	if err != nil {
		return fmt.Errorf("failed to lock balance: %w", err)
	}

	// 3. Update balance
	balanceAfter := balanceBefore + totalPayout
	_, err = tx.ExecContext(ctx,
		"UPDATE balances SET balance_smallest_unit = $1, updated_at = NOW() WHERE user_id = $2",
		balanceAfter, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to update balance: %w", err)
	}

	// 4. Create settlement_executed record (immutable audit trail)
	var settlementID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO settlement_executed (
			market_id, 
			user_id, 
			resolved_outcome, 
			trade_count,
			total_shares_won, 
			total_cost_basis_cents, 
			total_payout_cents,
			pnl_cents, 
			balance_before_cents, 
			balance_after_cents,
			market_resolved_at, 
			execution_batch_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, gen_random_uuid())
		ON CONFLICT (user_id, market_id) DO UPDATE SET
			trade_count = settlement_executed.trade_count + EXCLUDED.trade_count,
			total_shares_won = settlement_executed.total_shares_won + EXCLUDED.total_shares_won,
			total_cost_basis_cents = settlement_executed.total_cost_basis_cents + EXCLUDED.total_cost_basis_cents,
			total_payout_cents = settlement_executed.total_payout_cents + EXCLUDED.total_payout_cents,
			pnl_cents = settlement_executed.pnl_cents + EXCLUDED.pnl_cents,
			balance_after_cents = EXCLUDED.balance_after_cents
		RETURNING id`,
		marketID,
		userID,
		outcome,
		len(tradeIDs),
		totalShares,
		totalCost,
		totalPayout,
		totalPayout-totalCost, // PnL
		balanceBefore,
		balanceAfter,
		marketResolvedAt,
	).Scan(&settlementID)
	if err != nil {
		return fmt.Errorf("failed to insert settlement_executed: %w", err)
	}

	// 5. Link individual trades to settlement (settlement_trade_refs)
	for i := range tradeIDs {
		payout := shares[i] * 100 // 100 cents per share
		_, err = tx.ExecContext(ctx, `
			INSERT INTO settlement_trade_refs (
				settlement_id,
				trade_id,
				shares,
				cost_cents,
				payout_cents
			) VALUES ($1, $2, $3, $4, $5)`,
			settlementID,
			tradeIDs[i],
			shares[i],
			costs[i],
			payout,
		)
		if err != nil {
			return fmt.Errorf("failed to insert settlement_trade_refs: %w", err)
		}
	}

	// 6. Log balance transaction for audit trail
	_, err = tx.ExecContext(ctx, `
		INSERT INTO balance_transactions (
			user_id, 
			type, 
			amount_smallest_unit, 
			balance_after_smallest_unit,
			reference_id, 
			description
		) VALUES ($1, $2, $3, $4, $5, $6)`,
		userID,
		"SETTLEMENT_PAYOUT", // This enum value must exist!
		totalPayout,
		balanceAfter,
		settlementID,
		fmt.Sprintf("Market settlement: %d trades", len(tradeIDs)),
	)
	if err != nil {
		// If this fails due to enum, we have a clear error message
		return fmt.Errorf("failed to insert balance_transactions (check SETTLEMENT_PAYOUT enum exists): %w", err)
	}

	// 7. Mark staged records as COMPLETED
	_, err = tx.ExecContext(ctx,
		"UPDATE settlement_staged SET status = 'COMPLETED', processed_at = NOW() WHERE id = ANY($1)",
		pq.Array(stagedIDs),
	)
	if err != nil {
		return fmt.Errorf("failed to mark as COMPLETED: %w", err)
	}

	// 8. Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

/*
Janitor runs teh clean up func every hour

FUNCTION:
  - Removes completed staging records older than 1 hr
  - Keeps staging table small and performant
*/
func (w *SettlementMinion) Janitor(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	log.Printf("janitor started (i hr)")

	w.runCleanup(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("janitor shutting down... ")
			return
		case <-ticker.C:
			w.runCleanup(ctx)
		}
	}
}

func (w *SettlementMinion) runCleanup(ctx context.Context) {
	query := `SELECT cleanup_staged_settlements()`

	var deletedCount int
	err := w.db.QueryRowContext(ctx, query).Scan(&deletedCount)

	if err != nil {
		log.Printf("cleanup err: %v", err)
		return
	}

	if deletedCount > 0 {
		log.Printf("cleanup: %d old staging records removed", deletedCount)
	}
}

/* func (w *SettlementMinion) processSettlement(ctx context.Context, userID string, marketID string, stagedIDs []string, totalPayout int64) error {
	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Lock and Update Balance
	var balanceBefore int64
	err = tx.QueryRowContext(ctx, "SELECT balance_smallest_unit FROM balances WHERE user_id = $1 FOR UPDATE", userID).Scan(&balanceBefore)
	if err != nil {
		return fmt.Errorf("failed to lock balance: %w", err)
	}

	balanceAfter := balanceBefore + totalPayout
	_, err = tx.ExecContext(ctx, "UPDATE balances SET balance_smallest_unit = $1, updated_at = NOW() WHERE user_id = $2", balanceAfter, userID)
	if err != nil {
		return fmt.Errorf("failed to update balance: %w", err)
	}

	// 2. Mark Staged Rows as COMPLETED
	_, err = tx.ExecContext(ctx, "UPDATE settlement_staged SET status = 'COMPLETED', processed_at = NOW() WHERE id = ANY($1)", pq.Array(stagedIDs))
	if err != nil {
		return fmt.Errorf("failed to update staging status: %w", err)
	}

	// 3. Create Audit Record
	var settlementID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO settlement_executed (
			market_id, user_id, resolved_outcome, trade_count,
			total_shares_won, total_cost_basis_cents, total_payout_cents,
			pnl_cents, balance_before_cents, balance_after_cents,
			market_resolved_at, execution_batch_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), gen_random_uuid())
		RETURNING id`,
		marketID, userID, outcome, len(stagedIDs),
		totalShares, totalCost, totalPayout,
		totalPayout-totalCost, balanceBefore, balanceAfter,
	).Scan(&settlementID)
	if err != nil {
		return fmt.Errorf("failed to insert audit record: %w", err)
	}

	// 4. Log Transaction for History
	_, err = tx.ExecContext(ctx, `
		INSERT INTO balance_transactions (
			user_id, type, amount_smallest_unit, balance_after_smallest_unit,
			reference_id, description
		) VALUES ($1, 'SETTLEMENT_PAYOUT', $2, $3, $4, $5)`,
		userID, totalPayout, balanceAfter, settlementID, "Market settlement: "+marketID,
	)
	if err != nil {
		return fmt.Errorf("failed to log balance transaction: %w", err)
	}

	return tx.Commit()
}
*/
/*
GetSettlementStatus returns current settlement status for monitoring

USAGE:

	status, err := worker.GetSettlementStatus(ctx)

RETURNS:
  - Market settlement status
  - Users pending/ready/processing/settled
  - Total payout amounts
*/
func (w *SettlementMinion) GetSettlementStatus(ctx context.Context) ([]SettlementStatus, error) {
	query := `
		SELECT 
			market_id, question, resolved_outcome, resolved_at,
			users_pending, users_ready, users_processing, users_settled,
			COALESCE(total_paid_cents, 0) as total_paid_cents
		FROM v_settlement_status
		ORDER BY resolved_at DESC
		LIMIT 20
	`

	rows, err := w.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []SettlementStatus
	for rows.Next() {
		var status SettlementStatus
		err := rows.Scan(
			&status.MarketID,
			&status.Question,
			&status.ResolvedOutcome,
			&status.ResolvedAt,
			&status.UsersPending,
			&status.UsersReady,
			&status.UsersProcessing,
			&status.UsersSettled,
			&status.TotalPaidCents,
		)
		if err != nil {
			return nil, err
		}
		statuses = append(statuses, status)
	}

	return statuses, nil
}

// SettlementStatus represents the settlement status of a market
type SettlementStatus struct {
	MarketID        string    `json:"market_id"`
	Question        string    `json:"question"`
	ResolvedOutcome string    `json:"resolved_outcome"`
	ResolvedAt      time.Time `json:"resolved_at"`
	UsersPending    int       `json:"users_pending"`
	UsersReady      int       `json:"users_ready"`
	UsersProcessing int       `json:"users_processing"`
	UsersSettled    int       `json:"users_settled"`
	TotalPaidCents  int64     `json:"total_paid_cents"`
}
