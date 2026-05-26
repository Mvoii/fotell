// fotell/amm/market.go
package amm

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/shopspring/decimal"

	"github.com/Mvoii/fotell/engine"
)

/*
// represents current lifecycle of teh market
type MarketStatus int

const (
	StatusActive MarketStatus = iota
	StatusResolved
)

const (
	OutcomeYes = 0
	OutcomeNo  = 1
)

var (
	ErrMarketResolved = errors.New("market is already resolved, trading is halted")
	ErrInvalidOutcome  = errors.New("invalid outcome: must be OutcomeYes (0) pr outcomeNo (1)")
)

// trade receipt represents an uimmutable record of a successful transaction
type TradeReceipt struct {
	MarketID     string
	OutcomeIndex int
	SharesBought decimal.Decimal
	CostPaid     decimal.Decimal
	NewPrices    []decimal.Decimal
	Timestamp    time.Time
}

// binary market; a thread safe wrapper around teh lsmr
type BinaryMarket struct {
	mu sync.RWMutex // protects all fields below

	id             string
	question       string
	engine         *engine.LSMREngine
	status         MarketStatus
	winningOutcome *int // nil until resolved
	createdAt      time.Time
}

*/

/*
/// NewBinaryMarket init a new amm for yes/no market

/// params:
/// - id: unique id for market
/// - question: the prediction market question
/// - liquidityParam: teh 'b' param controlling price volatility

func NewBinaryMarket(id, question string, liquidityParam decimal.Decimal) (*BinaryMarket, error) {
	// enforce two outcomes
	lsmrEngine, err := engine.NewLSMREngine(2, liquidityParam)
	if err != nil {
		return nil, fmt.Errorf("failed to init lsmr: %w", err)
	}

	return &BinaryMarket{
		id:        id,
		question:  question,
		engine:    lsmrEngine,
		status:    StatusActive,
		createdAt: time.Now(),
	}, nil
}
*/

/*
/// buy safely execs a purchase in a concurrent env
/// it locks the market to prevent race conditions durin state mutayion

func (m *BinaryMarket) Buy(outcomeIndex int, amount decimal.Decimal) (*TradeReceipt, error) {
	// Acquire an exclusive write lock
	m.mu.Lock()
	defer m.mu.Unlock()

	// 1. Validate Market State
	if m.status != StatusActive {
		return nil, ErrMarketResolved
	}

	// 2. Validate Outcome Domain
	if outcomeIndex != OutcomeYes && outcomeIndex != OutcomeNo {
		return nil, ErrInvalidOutcome
	}

	// 3. Execute Purchase via Engine
	// ExecutePurchase updates the quantities state and calculates new prices
	cost, newPrices, err := m.engine.ExecutePurchase(outcomeIndex, amount)
	if err != nil {
		return nil, fmt.Errorf("trade execution failed: %w", err)
	}

	// 4. Generate Receipt
	return &TradeReceipt{
		MarketID:     m.id,
		OutcomeIndex: outcomeIndex,
		SharesBought: amount,
		CostPaid:     cost,
		NewPrices:    newPrices,
		Timestamp:    time.Now(),
	}, nil
}

*/

/*
/// GetPrices safely reads the current market probabilities/prices.
/// Uses a read-lock, allowing multiple users to view prices simultaneously without blocking.

func (m *BinaryMarket) GetPrices() (yesPrice, noPrice decimal.Decimal, err error) {
	// Acquire a shared read lock
	m.mu.RLock()
	defer m.mu.RUnlock()

	prices, err := m.engine.CalculatePrices()
	if err != nil {
		return decimal.Zero, decimal.Zero, fmt.Errorf("failed to calculate prices: %w", err)
	}

	return prices[OutcomeYes], prices[OutcomeNo], nil
}


*/

/*
 market.go - The market struct: a thhread safe binary market

CONCURRENCY MODEL

every market has a single rw Mutex
	- Rlock: GetPrices, GetUserPosition, Snapshot, Trades
	- Wlock: Buy, Open, Cloase, Resolve

lock ordering to prevent deadlocks
 Registry.mu -> Market.mu
 always acquire the registry lock before the market lock if you ever need both.
 In practice fetch market from regisrty, releasse registry lock, tehn lock market

 immutable fields: id, question, creatdby, createdAt, closesAt, liquidityParam

 mutable fields: status, engine, trades, positions, outcome, resolvedAt, resolvedBy, totalVolume
*/

// / minsharedamount is teh min num of shares a user can purchase in a
// / single trade. 1 share = 1 unit of the quantityvector
// / set to one for teh mvp; lower values require more precisin in cost
var MinShareAmount = decimal.NewFromInt(1)

// / market represents one live binary prediction market
// /
// / external callers receive a *market from registry and call its methods
// / tehy never construct a market directly - registry owns the creation
type Market struct {
	// immutable
	id             string
	question       string
	createdBy      string
	createdAt      time.Time
	closesAt       time.Time
	liquidityParam decimal.Decimal

	// mutable
	mu sync.RWMutex // mu serializes all the state changes. see concurrency model above

	status MarketStatus // status is teh market position in teh lifecycle state machine

	engine *engine.LSMREngine

	// trads is teh append only ledger of every completed trade
	// use a slice to preserve chronological order and easier replay and audit
	trades []Trade

	// position in tne per user aggrigate holding, key = userID
	positions map[string]*UserPosition

	totalVolume decimal.Decimal

	outcome *Outcome

	resolvedAt *time.Time
	resolvedBy string
}

// conrstuction, only called by registry
///
/// newMarket constructs a Market.
/// it is private; all creation goes trhough Registry.CreateMarket which
/// which validates the params and assigns a unique id

// . teh slmr engine is init with two outcomes, (yes = 0, No = 1)
func newMarket(params CreateMarketParams) (*Market, error) {
	// Validate ID is provided (must come from database)
	if params.ID == "" {
		return nil, fmt.Errorf("market ID is required")
	}

	if len(params.Question) <= 1 || len(params.Question) > 500 {
		return nil, ErrInvalidQuestion
	}

	if params.CreatedBy == "" {
		return nil, ErrInvalidUserID
	}

	if !params.ClosesAt.After(time.Now().UTC()) {
		return nil, ErrClosesAtInPast
	}

	if params.LiquidityParam.LessThanOrEqual(decimal.Zero) {
		return nil, ErrInvalidLiquidityParam
	}

	// iit engine
	eng, err := engine.NewLSMREngine(2, params.LiquidityParam)
	if err != nil {
		return nil, fmt.Errorf("failed to init lsmr: %w", err)
	}

	// id, err := generateID()
	// if err != nil {
	// 	return nil, fmt.Errorf("failed to generate market id: %w", err)
	// }

	return &Market{
		id:             params.ID,
		question:       params.Question,
		createdBy:      params.CreatedBy,
		createdAt:      time.Now().UTC(),
		closesAt:       params.ClosesAt.UTC(),
		liquidityParam: params.LiquidityParam,
		status:         StatusPending,
		engine:         eng,
		trades:         make([]Trade, 0),
		positions:      make(map[string]*UserPosition),
		totalVolume:    decimal.Zero,
	}, nil
}

// --- state machine transitions --- //
/*
transitions the market from pending to StatsuOpen

acquires write lock
*/
func (m *Market) Open() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.status != StatusPending {
		return fmt.Errorf("%w: current status is %s", ErrMarketAlreadyOpen, m.status)
	}
	if m.status == StatusResolved {
		return fmt.Errorf("%w: current status is %s", ErrMarketAlreadyResolved, m.status)
	}

	m.status = StatusOpen
	return nil
}

/*
Close transitions the market from StatusOpen → StatusClosed.

After this call no new trades are accepted. The market must be in StatusClosed
before Resolve() can be called. This two-step close-then-resolve pattern
prevents a race condition where a trade arrives simultaneously with a
resolution call.

Thread-safe: acquires write lock.
*/
func (m *Market) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.status == StatusClosed {
		return fmt.Errorf("%w: current status is %s", ErrMarketAlreadyClosed, m.status)
	}

	if m.status == StatusPending {
		return fmt.Errorf("%w: current status is %s", ErrMarketAlreadyClosed, m.status)
	}

	if m.status == StatusResolved {
		return fmt.Errorf("%w: current status is %s", ErrMarketAlreadyClosed, m.status)
	}

	m.status = StatusClosed
	return nil
}

/*
Resolve transitions the market from StatusClosed → StatusResolved and
records the winning outcome.

Parameters:
  - outcome:    OutcomeYES or OutcomeNO
  - resolvedBy: the operator/admin user ID recording the result

What happens here:
  1. The outcome is recorded on the market.
  2. Every user's RealizedPnL is computed:
       - Winners: payout = shares × 100  (each winning share redeems at KES 100)
       - Losers:  payout = 0
       - PnL = payout − TotalCostBasis

Thread-safe: acquires write lock.
*/
func (m *Market) Resolve(outcome Outcome, resolvedBy string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.status == StatusResolved {
		return ErrMarketAlreadyResolved
	}

	if m.status != StatusClosed {
		return fmt.Errorf("%w: current status is %s", ErrMarketNotClosed, m.status)
	}

	if resolvedBy == "" {
		return ErrInvalidUserID
	}

	// Validate outcome is one of the two legal values
	if outcome != OutcomeYes && outcome != OutcomeNo {
		return ErrInvalidOutcome
	}

	// Record resolution metadata
	now := time.Now().UTC()
	m.outcome = &outcome
	m.resolvedAt = &now
	m.resolvedBy = resolvedBy
	m.status = StatusResolved

	// Settle every user position.
	// Winning share pays out KES 100 each. Losing share pays KES 0.
	// Payout per outcome is based on which index won.
	hundredKES := decimal.NewFromInt(100)

	for _, pos := range m.positions {
		var winningShares decimal.Decimal

		if outcome == OutcomeYes {
			winningShares = pos.YesShares
		} else {
			winningShares = pos.NoShares
		}

		payout := winningShares.Mul(hundredKES)
		pos.RealizedPnL = payout.Sub(pos.TotalCostBasis)
	}

	return nil
}


// ── Core trading operation 

/*
Buy executes a purchase of shares in a binary outcome.

Parameters:
  - userID:      the buyer's unique identifier
  - outcome:     BuyYES or BuyNO
  - shareAmount: number of shares to purchase (must be ≥ MinShareAmount)
  - maxCost:     slippage guard — if the computed cost exceeds this value,
                 the trade is rejected and ErrTradeWouldExceedMaxCost is
                 returned. Pass decimal.Zero to disable the guard.

Returns a TradeReceipt on success. The receipt contains the exact KES cost
that must be debited from the user's external balance — this layer does NOT
manage balances, it only computes and records trades.

ATOMICITY: Under the write lock, the engine state, trade ledger, and user
position are all updated together. If any step fails, the engine state is
rolled back by the LSMR engine's own rollback in ExecutePurchase.

Thread-safe: acquires write lock.
*/
func (m *Market) Buy(
	userID string,
	outcome BinaryOutcome,
	shareAmount decimal.Decimal,
	maxCost decimal.Decimal,
) (*TradeReceipt, error) {

	// Input validation (before acquiring lock — fast path)
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	if outcome != BuyYES && outcome != BuyNO {
		return nil, ErrInvalidOutcome
	}

	if shareAmount.LessThan(MinShareAmount) {
		return nil, fmt.Errorf("%w: minimum is %s shares", ErrInvalidShareAmount, MinShareAmount)
	}

	// --- Critical section
	m.mu.Lock()
	defer m.mu.Unlock()

	// Gate: market must be open
	if m.status != StatusOpen {
		return nil, fmt.Errorf("%w: status is %s", ErrMarketNotOpen, m.status)
	}

	// Snapshot prices BEFORE the trade so the receipt shows market impact
	pricesBefore, err := m.engine.CalculatePrices()
	if err != nil {
		return nil, fmt.Errorf("failed to read pre-trade prices: %w", err)
	}
	yesBefore := pricesBefore[BuyYES.ToOutcomeIndex()]
	noBefore := pricesBefore[BuyNO.ToOutcomeIndex()]

	// Slippage guard: compute cost WITHOUT mutating engine state.
	// If maxCost > 0 and the projected cost exceeds it, abort.
	if maxCost.GreaterThan(decimal.Zero) {
		projectedCost, err := m.engine.CalculatePurchaseCost(outcome.ToOutcomeIndex(), shareAmount)
		if err != nil {
			return nil, fmt.Errorf("failed to project trade cost: %w", err)
		}
		if projectedCost.GreaterThan(maxCost) {
			return nil, fmt.Errorf(
				"%w: projected %s, max %s",
				ErrTradeWouldExceedMaxCost,
				projectedCost,
				maxCost,
			)
		}
	}

	// Execute the purchase on the LSMR engine.
	// ExecutePurchase atomically:
	//   a) computes the cost
	//   b) updates the quantity vector
	//   c) returns new prices
	// On error it rolls back the quantity update internally.
	cost, pricesAfter, err := m.engine.ExecutePurchase(outcome.ToOutcomeIndex(), shareAmount)
	if err != nil {
		return nil, fmt.Errorf("engine purchase failed: %w", err)
	}

	yesAfter := pricesAfter[BuyYES.ToOutcomeIndex()]
	noAfter := pricesAfter[BuyNO.ToOutcomeIndex()]

	// Generate a unique trade ID
	tradeID, err := generateID()
	if err != nil {
		// This is catastrophic — roll back the engine state manually.
		// We must undo what ExecutePurchase did.
		// ExecutePurchase does NOT expose a rollback API, so we call
		// SetQuantities with a pre-computed snapshot taken before the trade.
		//
		// NOTE: In production this is where you'd trigger an alert / circuit
		// breaker. We return an error rather than panic.
		return nil, fmt.Errorf("CRITICAL: trade ID generation failed after engine mutation: %w", err)
	}

	now := time.Now().UTC()

	// Append to the immutable trade ledger
	record := Trade{
		ID:              tradeID,
		MarketID:        m.id,
		UserID:          userID,
		Outcome:         outcome,
		SharesBought:    shareAmount,
		CostPaid:        cost,
		YesPriceBefore:  yesBefore,
		YesPriceAfter:   yesAfter,
		NoPriceBefore:   noBefore,
		NoPriceAfter:    noAfter,
		Timestamp:       now,
	}
	m.trades = append(m.trades, record)

	// Update (or initialise) the user's aggregate position
	pos, exists := m.positions[userID]
	if !exists {
		pos = &UserPosition{
			UserID:   userID,
			MarketID: m.id,
		}
		m.positions[userID] = pos
	}

	if outcome == BuyYES {
		pos.YesShares = pos.YesShares.Add(shareAmount)
	} else {
		pos.NoShares = pos.NoShares.Add(shareAmount)
	}
	pos.TotalCostBasis = pos.TotalCostBasis.Add(cost)

	// Update market-level volume tracker
	m.totalVolume = m.totalVolume.Add(cost)

	// Return receipt (copy of what was recorded)
	return &TradeReceipt{
		TradeID:       tradeID,
		MarketID:      m.id,
		UserID:        userID,
		Outcome:       outcome,
		SharesBought:  shareAmount,
		CostPaid:      cost,
		YesPriceAfter: yesAfter,
		NoPriceAfter:  noAfter,
		Timestamp:     now,
	}, nil
}

// ── Read-only queries 

/*
GetPrices returns the current YES and NO prices.

Prices are on the 0–100 scale representing implied probability percentages.
YesPrice + NoPrice == 100 (LSMR invariant).

Thread-safe: acquires read lock.
*/
func (m *Market) GetPrices() (*PriceQuote, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	prices, err := m.engine.CalculatePrices()
	if err != nil {
		return nil, fmt.Errorf("price calculation failed: %w", err)
	}

	return &PriceQuote{
		MarketID:  m.id,
		YesPrice:  prices[BuyYES.ToOutcomeIndex()],
		NoPrice:   prices[BuyNO.ToOutcomeIndex()],
		Timestamp: time.Now().UTC(),
	}, nil
}


/*
GetUserPosition returns a copy of the calling user's position in this market.
Returns a zeroed position (not an error) if the user has never traded here —
this keeps the API simpler for callers who just want to display "0 shares".

Thread-safe: acquires read lock.
*/
func (m *Market) GetUserPosition(userID string) (*UserPosition, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	pos, exists := m.positions[userID]
	if !exists {
		// Return a zeroed position rather than an error
		return &UserPosition{
			UserID:   userID,
			MarketID: m.id,
		}, nil
	}

	// Return a copy — caller must not mutate the live position
	copy := *pos
	return &copy, nil
}

/*
Snapshot returns a complete, immutable description of the market's current state.
Used by the registry list endpoint and admin UIs.

Thread-safe: acquires read lock.
*/
func (m *Market) Snapshot() (*MarketSnapshot, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	snap := &MarketSnapshot{
		ID:             m.id,
		Question:       m.question,
		Status:         m.status,
		CreatedBy:      m.createdBy,
		CreatedAt:      m.createdAt,
		ClosesAt:       m.closesAt,
		LiquidityParam: m.liquidityParam,
		TotalTrades:    len(m.trades),
		TotalVolume:    m.totalVolume,
		ResolvedBy:     m.resolvedBy,
	}

	// Include current prices for open markets
	if m.status == StatusOpen || m.status == StatusClosed {
		prices, err := m.engine.CalculatePrices()
		if err != nil {
			return nil, fmt.Errorf("price calculation failed in snapshot: %w", err)
		}
		snap.YesPrice = prices[BuyYES.ToOutcomeIndex()]
		snap.NoPrice = prices[BuyNO.ToOutcomeIndex()]
	}

	// Copy resolution data if present
	if m.outcome != nil {
		outcomeCopy := *m.outcome
		snap.Outcome = &outcomeCopy
	}
	if m.resolvedAt != nil {
		tCopy := *m.resolvedAt
		snap.ResolvedAt = &tCopy
	}

	return snap, nil
}

/*
trades retruns a copy of teh full ledger

teh copy ensures callers cannot alter internal history
in prod, paginate rather tahn return all

thread sae: get read lock
*/
func (m *Market) Trades() []Trade {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// deep copy so callers cannot mutate
	out := make([]Trade, len(m.trades))
	copy(out, m.trades)

	return out
}

/*
ID returns market id
*/
func (m *Market) ID() string {
	return m.id
}

/*
returns the market question
*/
func (m *Market) Question() string {
	return m.question
}

/*
status returns teh current market status
Thread-safe:acquires read lock
*/
func (m *Market) Status() MarketStatus {
	m.mu.Lock()
	defer m.mu.Unlock()

	return m.status
}

// --- internal helpers --- //

/*
creates a crypto random 16 byte hex string (32 chars)

no shared state to lock
*/

func generateID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("crypto/rand read failed: %w", err)
	}
	return hex.EncodeToString(b), nil
}
