package amm

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

/*
types.go - immutable value types and data-transfer obj for the AMM

 - types are separated from behaviour
 - All marketsnapshot, tradereceipt, etc are returned y value or as pointer-to-copy so callers cannot mutate internal market stae
 - decimal.Decomal is used for every monetary / probability field (never float64)
*/

// / enums
// / MarketStatus encodes teh lyfestyle of a binary prediction market
// / legal transactions (enforced by teh state machine in registry.go)
//
//	pending -> open -> closed -> resolved
//
// / uint8 to keep type small
// / persisted as string
type MarketStatus uint8

const (
	// market created not yet accepting trades
	// review before going live
	StatusPending MarketStatus = iota

	// market is accepting trades, lsmr engine prices update on every trade
	StatusOpen

	// trading window has ended, no new trades ebing accepted
	StatusClosed

	StatusResolved
)

func (s MarketStatus) String() string {
	switch s {
	case StatusPending:
		return "PENDING"
	case StatusOpen:
		return "OPEN"
	case StatusClosed:
		return "CLOSED"
	case StatusResolved:
		return "RESOLVED"
	default:
		return fmt.Sprintf("UNKOWN (%D)", s)
	}
}

// / Outcome represents the reoslved result of teh binary market
// / it is a pointer to teh market s we acn distinguish unresolved (nil)
// / from a concrete yes or no outcome without separaet boolean
type Outcome uint8

const (
	OutcomeYes Outcome = iota
	OutcomeNo
)

func (o Outcome) String() string {
	switch o {
	case OutcomeYes:
		return "YES"
	case OutcomeNo:
		return "NO"
	default:
		return fmt.Sprintf("UNKNOWN (%d)", o)
	}
}

/*
BinaryOutcome is teh sude a user picks when placing a trade
we keep it distinc from outome (resolved result) to make teh AMM self documnting - user "buys yes", a market "resolved to yes"
*/
type BinaryOutcome uint8

const (
	BuyYes BinaryOutcome = 0 //maps to lsmr outcome idx 0
	BuyNo  BinaryOutcome = 1
)

func (b BinaryOutcome) String() string {
	if b == BuyYes {
		return "YES"
	}
	return "NO"
}

// / ToOutcomeIndex converts a binaryoutcome to teh lsmr engine's 0-indexed int
// / This is teh single point of couplin th amm and the engine's
// / arr indexing, to keep all such conversions here
func (b BinaryOutcome) ToOutcomeIndex() int {
	return int(b)
}

// value obj
// / createMarketParams is teh balidated intput to teh registry.CreateMarket
// / All fielsd are required unless noted
// / liquidityparam (b) guide:
// / - use atleast 50x the expected avg trade size in KES
// / - mvp recs: 100 000 for low activity markets, 500 000+ for pooular ones
type CreateMarketParams struct {
	Question       string
	CreatedBy      string // userID
	ClosesAt       time.Time
	LiquidityParam decimal.Decimal
}

// immutable snaps returned to callers
/// priceQuote: a point in time snap of marketprice
/// retruned by Market.GetPrices(). prices are on the 0-100 scale (probabiities as percentages)

// / invairant: yesPrice + noPrice == 100
type PriceQuote struct {
	MarketId  string
	YesPrice  decimal.Decimal
	NoPrice   decimal.Decimal
	Timestamp time.Time
}

/// tradeReceipt is retruned to caller after successful buy
/// it is immutable - teh caller stores this;; the market keeps an internal trade

// / CostPaid is the actual KES debited; callers hould compare this against any Maxcost slippage guard they provide
type TradeReceipt struct {
	TradeID       string
	marketID      string
	UserID        string
	Outcome       BinaryOutcome
	SharesBought  decimal.Decimal // how many shares teh user is now holding
	CostPaid      decimal.Decimal // KES debited
	YesPriceAfter decimal.Decimal // price of yes immediately adter the trade
	NoPriceAfter  decimal.Decimal //peice of no after trade
	Timestamp     time.Time
}

// / trade is teh immutable internal record of a completed trade
// / it is written once and never modded
// / full ledger is appended on slice in Market. This is teh audit trail.
type Trade struct {
	ID             string
	marketID       string
	UserID         string
	Outcome        BinaryOutcome
	SharesBought   decimal.Decimal
	CostPaid       decimal.Decimal
	YesPriceBefore decimal.Decimal
	YesPriceAfter  decimal.Decimal
	NoPriceBefore  decimal.Decimal
	NoPriceAfter   decimal.Decimal
	Timestamp      time.Time
}

// / userposition tracks teh aggregate holdings of one user in one market
// / it is mutable inside market (protected by market rwmutex) but returned as a copy to callers
// / TotalCostBasis: sum of all costpaid across every trade by user
// / RealizedPnL: non zero only after resolution (payout - totalcostbasis)
type userPosition struct {
	UserID         string
	MarketID       string
	YesShares      decimal.Decimal
	NoShares       decimal.Decimal
	TotalCostBasis decimal.Decimal
	RealizedPnL    decimal.Decimal // set when nmarket reolves
}

// / ,arketsnapshot is a complete, point int time read of a market's state
// / Returned b Market.Snapshot() and Registry.ListMarkets()
// / it is a deep copy - callers cannot mutate the live market through it
type MarketSnapshot struct {
	ID             string
	Question       string
	Status         MarketStatus
	CreatedBy      string
	CreatedAt      time.Time
	ClosesAt       time.Time
	LiquidityParam decimal.Decimal

	// price data (nil before statusopen)
	YesPrice decimal.Decimal
	NoPrice  decimal.Decimal

	// resolution (nil until resolved)
	Outcome    *Outcome
	ResolvedAt *time.Time
	ResolvedBy string

	// activity metrics
	TotalTrades int
	TotalVolume decimal.Decimal
}
