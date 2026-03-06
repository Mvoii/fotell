// api/repository/balances.go

package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

/*
balances.go — Balance Repository

RESPONSIBILITIES:
  - CRUD operations for balances table
  - Balance adjustments (debit/credit)
  - Transaction history tracking
  - Atomic balance updates

FINANCIAL SAFETY:
  - All balance operations use database transactions
  - Balance cannot go negative (CHECK constraint)
  - Every balance change creates audit record
*/

type Balance struct {
	UserID              string
	BalanceSmallestUnit int64
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type BalanceRepository struct {
	db *sql.DB
}

func NewBalanceRepository(db *sql.DB) *BalanceRepository {
	return &BalanceRepository{db: db}
}

//
// READ
//

/*
GetByUserID retrieves a user's balance.

RETURNS:
  - Balance with current amount
  - sql.ErrNoRows if balance doesn't exist

SECURITY:
  - RLS ensures user can only see own balance
*/
func (r *BalanceRepository) GetByUserID(ctx context.Context, userID string) (*Balance, error) {
	query := `
		SELECT user_id, balance_smallest_unit, created_at, updated_at
		FROM balances
		WHERE user_id = $1
	`

	var balance Balance
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&balance.UserID,
		&balance.BalanceSmallestUnit,
		&balance.CreatedAt,
		&balance.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &balance, nil
}

//
// UPDATE
//

/*
Debit subtracts amount from user balance.

ATOMICITY:
  - Uses database transaction
  - Creates balance_transactions record
  - Fails if balance would go negative

USAGE:

	err := balanceRepo.Debit(ctx, userID, costPaid, tradeID, "TRADE_DEBIT")
*/
func (r *BalanceRepository) Debit(ctx context.Context, userID string, amount int64, referenceID, txType string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// update balance, fail if goes to negative
	query := `
		UPDATE balances
		SET balance_smallest_unit = balance_smallest_unit - $1,
			updates_at = NOW()
		WHERE user_id = $2
		RETURNING balance_smallest_unit
	`

	var newBalance int64
	err = tx.QueryRowContext(ctx, query, amount, userID).Scan(&newBalance)
	if err != nil {
		return fmt.Errorf("failed to debit balance: %w", err)
	}

	// record tx
	err = r.recordTransaction(ctx, tx, userID, -amount, newBalance, referenceID, txType, "")
	if err != nil {
		return fmt.Errorf("failed to record tx: %w", err)
	}

	return tx.Commit()
}

/*
Credit adds amount to user balance.

USAGE:

	err := balanceRepo.Credit(ctx, userID, payout, marketID, "PAYOUT_CREDIT")
*/
func (r *BalanceRepository) Credit(ctx context.Context, userID string, amount int64, referenceID string, txType string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		UPDATE balances
		SET balance_smallest_unit = balance_smallest_unit + $1,
			updated_at = NOW()
		WHERE user_id = $2
		RETURNING balance_smallest_unit
	`

	var newBalance int64
	err = tx.QueryRowContext(ctx, query, amount, userID).Scan(&newBalance)
	if err != nil {
		return fmt.Errorf("failed to credit balance: %w", err)
	}

	// record tx
	err = r.recordTransaction(ctx, tx, userID, amount, newBalance, referenceID, txType, "")
	if err != nil {
		return fmt.Errorf("failed to record tx: %w", err)
	}

	return tx.Commit()
}

// internal helpers

/*
recordTransaction creates an audit record for a balance change.

CALLED BY:
  - Debit
  - Credit
  - Any balance adjustment

IMMUTABLE:
  - Records are never updated or deleted
  - Full audit trail preserved
*/
func (r *BalanceRepository) recordTransaction(ctx context.Context, tx *sql.Tx, userID string, amount int64, balanceAfter int64, referenceID string, txType string, description string) error {
	query := `
		INSERT INTO balance_transactions (
			user_id, type, amount_smallest_unit, balance_after_smallest_unit, reference_id, description 
		) VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := tx.ExecContext(
		ctx, query, userID, txType, amount, balanceAfter, sql.NullString{String: referenceID, Valid: referenceID != ""}, sql.NullString{String: description, Valid: description != ""},
	)

	return err
}
