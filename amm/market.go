package amm

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/shopspring/decimal"

	"github.com/Mvoii/fotell/engine"
)

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
	ErrInvaldOutcome  = errors.New("invalid outcome: must be OutcomeYes (0) pr outcomeNo (1)")
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

/*
NewBinaryMarket init a new amm for yes/no market

params:
- id: unique id for market
- question: the prediction market question
- liquidityParam: teh 'b' param controlling price volatility
*/
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
