package amm

import (
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
	createdAt      string
	closesAt       string
	liquidityParam decimal.Decimal

	// mutable
	mu sync.RWMutex // mu serializes all the state changes. see concurrency model above

	status MarketStatus // status is teh market position in teh lifecycle state machine

	engine *engine.LSMREngine

	// trads is teh append only ledger of every completed trade
	// use a slice to preserve chronological order and easier replay and audit
	trades []Trade

	// position in tne per user aggrigate holding, key = userID
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

//. teh slmr engine is init with two outcomes, (yes = 0, No = 1)
func newMarket(params CreateMarketParams) (*Market, error){}
