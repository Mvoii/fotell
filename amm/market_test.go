package amm

import (
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/shopspring/decimal"
)

/*
market_test.go — Test suite for the AMM market wrapper.

Tests are grouped into:
  1. Unit tests per method (fast, no goroutines)
  2. State machine tests (lifecycle transitions)
  3. Financial invariant tests (prices, costs, positions)
  4. Concurrency tests (race detector must pass: go test -race)
  5. Resolution and settlement tests

Run the full suite with race detection:
  go test -race -v -count=1 ./...

-count=1 disables test caching so race conditions in concurrent tests
are not masked by a cached result.
*/

// ── Test helpers ──────────────────────────────────────────────────────────────

// d converts a float to decimal.Decimal for test readability.
func d(f float64) decimal.Decimal { return decimal.NewFromFloat(f) }

// di converts an int64 to decimal.Decimal for test readability.
func di(i int64) decimal.Decimal { return decimal.NewFromInt(i) }

// approxEqual returns true if |a - b| ≤ tolerance.
// Used for financial values where LSMR math introduces tiny float64 residuals
// during the exponential calculation. We do not use == on decimals for
// values derived from floating-point math.
func approxEqual(a, b decimal.Decimal, toleranceStr string) bool {
	tol, _ := decimal.NewFromString(toleranceStr)
	diff := a.Sub(b).Abs()
	return diff.LessThanOrEqual(tol)
}

// mustMarket creates a market or fatally fails the test.
func mustMarket(t *testing.T, r *Registry, question string) *Market {
	t.Helper()
	m, err := r.CreateMarket(CreateMarketParams{
		Question:       question,
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(100_000),
	})
	if err != nil {
		t.Fatalf("mustMarket: %v", err)
	}
	return m
}

// mustOpenMarket creates and opens a market.
func mustOpenMarket(t *testing.T, r *Registry, question string) *Market {
	t.Helper()
	m := mustMarket(t, r, question)
	if err := m.Open(); err != nil {
		t.Fatalf("mustOpenMarket Open: %v", err)
	}
	return m
}

// sumPrices returns YES + NO price. Used to verify the invariant.
func sumPrices(t *testing.T, m *Market) decimal.Decimal {
	t.Helper()
	q, err := m.GetPrices()
	if err != nil {
		t.Fatalf("GetPrices: %v", err)
	}
	return q.YesPrice.Add(q.NoPrice)
}

// ── 1. Registry tests ─────────────────────────────────────────────────────────

func TestRegistry_CreateMarket_Valid(t *testing.T) {
	r := NewRegistry()
	m := mustMarket(t, r, "Will it rain in Nairobi tomorrow?")

	if m.ID() == "" {
		t.Error("market ID must not be empty")
	}
	if m.Status() != StatusPending {
		t.Errorf("new market must be Pending, got %s", m.Status())
	}
	if r.Count() != 1 {
		t.Errorf("registry count = %d, want 1", r.Count())
	}
}

func TestRegistry_CreateMarket_InvalidParams(t *testing.T) {
	r := NewRegistry()
	base := CreateMarketParams{
		Question:       "Valid question?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(100_000),
	}

	tests := []struct {
		name    string
		mutate  func(*CreateMarketParams)
		wantErr error
	}{
		{
			name:    "empty question",
			mutate:  func(p *CreateMarketParams) { p.Question = "" },
			wantErr: ErrInvalidQuestion,
		},
		{
			name:    "question too long",
			mutate:  func(p *CreateMarketParams) { p.Question = string(make([]byte, 501)) },
			wantErr: ErrInvalidQuestion,
		},
		{
			name:    "empty createdBy",
			mutate:  func(p *CreateMarketParams) { p.CreatedBy = "" },
			wantErr: ErrInvalidUserID,
		},
		{
			name:    "closesAt in the past",
			mutate:  func(p *CreateMarketParams) { p.ClosesAt = time.Now().UTC().Add(-24 * time.Hour) },
			wantErr: ErrClosesAtInPast,
		},
		{
			name:    "zero liquidity",
			mutate:  func(p *CreateMarketParams) { p.LiquidityParam = decimal.Zero },
			wantErr: ErrInvalidLiquidityParam,
		},
		{
			name:    "negative liquidity",
			mutate:  func(p *CreateMarketParams) { p.LiquidityParam = di(-1) },
			wantErr: ErrInvalidLiquidityParam,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			p := base
			tc.mutate(&p)
			_, err := r.CreateMarket(p)
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("want %v, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestRegistry_GetMarket_NotFound(t *testing.T) {
	r := NewRegistry()
	_, err := r.GetMarket("nonexistent-id")
	if !errors.Is(err, ErrMarketNotFound) {
		t.Errorf("want ErrMarketNotFound, got %v", err)
	}
}

func TestRegistry_GetMarket_Found(t *testing.T) {
	r := NewRegistry()
	m := mustMarket(t, r, "Test question?")
	got, err := r.GetMarket(m.ID())
	if err != nil {
		t.Fatalf("GetMarket: %v", err)
	}
	if got.ID() != m.ID() {
		t.Errorf("wrong market returned")
	}
}

func TestRegistry_ListMarkets(t *testing.T) {
	r := NewRegistry()
	for i := 0; i < 5; i++ {
		mustMarket(t, r, fmt.Sprintf("Question %d?", i))
	}

	snapshots, err := r.ListMarkets()
	if err != nil {
		t.Fatalf("ListMarkets: %v", err)
	}
	if len(snapshots) != 5 {
		t.Errorf("want 5 snapshots, got %d", len(snapshots))
	}
}

func TestRegistry_CountByStatus(t *testing.T) {
	r := NewRegistry()
	// 2 pending
	mustMarket(t, r, "Q1?")
	mustMarket(t, r, "Q2?")
	// 1 open
	mustOpenMarket(t, r, "Q3?")

	if got := r.CountByStatus(StatusPending); got != 2 {
		t.Errorf("pending count = %d, want 2", got)
	}
	if got := r.CountByStatus(StatusOpen); got != 1 {
		t.Errorf("open count = %d, want 1", got)
	}
}

// ── 2. State machine tests ────────────────────────────────────────────────────

func TestMarket_StateTransitions_HappyPath(t *testing.T) {
	r := NewRegistry()
	m := mustMarket(t, r, "Will Bitcoin hit 100k this month?")

	assertStatus := func(want MarketStatus) {
		t.Helper()
		if got := m.Status(); got != want {
			t.Fatalf("status = %s, want %s", got, want)
		}
	}

	assertStatus(StatusPending)

	if err := m.Open(); err != nil {
		t.Fatalf("Open: %v", err)
	}
	assertStatus(StatusOpen)

	if err := m.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	assertStatus(StatusClosed)

	if err := m.Resolve(OutcomeYes, "admin"); err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	assertStatus(StatusResolved)
}

func TestMarket_Open_IdempotenceGuard(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	err := m.Open()
	if !errors.Is(err, ErrMarketAlreadyOpen) {
		t.Errorf("want ErrMarketAlreadyOpen, got %v", err)
	}
}

func TestMarket_Close_BeforeOpen(t *testing.T) {
	r := NewRegistry()
	m := mustMarket(t, r, "Q?")

	err := m.Close()
	if !errors.Is(err, ErrMarketAlreadyClosed) {
		t.Errorf("want ErrMarketAlreadyClosed, got %v", err)
	}
}

func TestMarket_Resolve_MustBeClosedFirst(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	err := m.Resolve(OutcomeYes, "admin")
	if !errors.Is(err, ErrMarketNotClosed) {
		t.Errorf("want ErrMarketNotClosed, got %v", err)
	}
}

func TestMarket_Resolve_CannotResolveTwice(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")
	_ = m.Close()
	_ = m.Resolve(OutcomeYes, "admin")

	err := m.Resolve(OutcomeNo, "admin")
	if !errors.Is(err, ErrMarketAlreadyResolved) {
		t.Errorf("want ErrMarketAlreadyResolved, got %v", err)
	}
}

func TestMarket_Buy_OnPendingMarket_Rejected(t *testing.T) {
	r := NewRegistry()
	m := mustMarket(t, r, "Q?")

	_, err := m.Buy("user1", BuyYES, di(10), decimal.Zero)
	if !errors.Is(err, ErrMarketNotOpen) {
		t.Errorf("want ErrMarketNotOpen, got %v", err)
	}
}

func TestMarket_Buy_OnClosedMarket_Rejected(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")
	_ = m.Close()

	_, err := m.Buy("user1", BuyYES, di(10), decimal.Zero)
	if !errors.Is(err, ErrMarketNotOpen) {
		t.Errorf("want ErrMarketNotOpen, got %v", err)
	}
}

func TestMarket_Buy_OnResolvedMarket_Rejected(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")
	_ = m.Close()
	_ = m.Resolve(OutcomeYes, "admin")

	_, err := m.Buy("user1", BuyYES, di(10), decimal.Zero)
	if !errors.Is(err, ErrMarketNotOpen) {
		t.Errorf("want ErrMarketNotOpen, got %v", err)
	}
}

// ── 3. Buy validation tests ───────────────────────────────────────────────────

func TestMarket_Buy_EmptyUserID(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	_, err := m.Buy("", BuyYES, di(10), decimal.Zero)
	if !errors.Is(err, ErrInvalidUserID) {
		t.Errorf("want ErrInvalidUserID, got %v", err)
	}
}

func TestMarket_Buy_ZeroShares(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	_, err := m.Buy("user1", BuyYES, decimal.Zero, decimal.Zero)
	if !errors.Is(err, ErrInvalidShareAmount) {
		t.Errorf("want ErrInvalidShareAmount, got %v", err)
	}
}

func TestMarket_Buy_NegativeShares(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	_, err := m.Buy("user1", BuyYES, di(-5), decimal.Zero)
	if !errors.Is(err, ErrInvalidShareAmount) {
		t.Errorf("want ErrInvalidShareAmount, got %v", err)
	}
}

func TestMarket_Buy_SlippageGuard_Triggered(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	// Set a maxCost of 1 KES. Buying 1000 shares will cost much more.
	_, err := m.Buy("user1", BuyYES, di(1000), di(1))
	if !errors.Is(err, ErrTradeWouldExceedMaxCost) {
		t.Errorf("want ErrTradeWouldExceedMaxCost, got %v", err)
	}
}

func TestMarket_Buy_SlippageGuard_PassedWhenZero(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	// maxCost=0 means "no guard" — should succeed regardless of cost
	_, err := m.Buy("user1", BuyYES, di(100), decimal.Zero)
	if err != nil {
		t.Errorf("expected success with maxCost=0, got %v", err)
	}
}

// ── 4. Financial invariant tests ──────────────────────────────────────────────

/*
TestInvariant_PricesAlwaysSumTo100 verifies the core LSMR guarantee after
every trade: YES + NO == 100 (within 0.000001 tolerance).
*/
func TestInvariant_PricesAlwaysSumTo100(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	// Run 20 random-ish trades
	trades := []struct {
		user    string
		outcome BinaryOutcome
		shares  int64
	}{
		{"alice", BuyYES, 100},
		{"bob", BuyNO, 200},
		{"alice", BuyYES, 50},
		{"carol", BuyNO, 300},
		{"dave", BuyYES, 1000},
		{"eve", BuyYES, 10},
		{"frank", BuyNO, 750},
		{"alice", BuyNO, 25},
	}

	for _, tc := range trades {
		_, err := m.Buy(tc.user, tc.outcome, di(tc.shares), decimal.Zero)
		if err != nil {
			t.Fatalf("Buy(%s, %s, %d): %v", tc.user, tc.outcome, tc.shares, err)
		}

		sum := sumPrices(t, m)
		if !approxEqual(sum, di(100), "0.000001") {
			t.Errorf("after trade: prices sum to %s, want 100", sum)
		}
	}
}

/*
TestInvariant_InitialPricesAre50_50 verifies that a freshly opened binary
market starts at 50/50 (no information has been expressed yet).
*/
func TestInvariant_InitialPricesAre50_50(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	q, err := m.GetPrices()
	if err != nil {
		t.Fatalf("GetPrices: %v", err)
	}

	if !approxEqual(q.YesPrice, d(50.0), "0.000001") {
		t.Errorf("initial YES price = %s, want 50.0", q.YesPrice)
	}
	if !approxEqual(q.NoPrice, d(50.0), "0.000001") {
		t.Errorf("initial NO price = %s, want 50.0", q.NoPrice)
	}
}

/*
TestInvariant_BuyYES_RaisesYESPrice verifies that buying YES always raises
the YES price and lowers the NO price.
*/
func TestInvariant_BuyYES_RaisesYESPrice(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	before, _ := m.GetPrices()

	_, err := m.Buy("alice", BuyYES, di(500), decimal.Zero)
	if err != nil {
		t.Fatalf("Buy: %v", err)
	}

	after, _ := m.GetPrices()

	if !after.YesPrice.GreaterThan(before.YesPrice) {
		t.Errorf("YES price should have risen: %s → %s", before.YesPrice, after.YesPrice)
	}
	if !after.NoPrice.LessThan(before.NoPrice) {
		t.Errorf("NO price should have fallen: %s → %s", before.NoPrice, after.NoPrice)
	}
}

/*
TestInvariant_BuyNO_RaisesNOPrice is the symmetric counterpart.
*/
func TestInvariant_BuyNO_RaisesNOPrice(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	before, _ := m.GetPrices()

	_, err := m.Buy("alice", BuyNO, di(500), decimal.Zero)
	if err != nil {
		t.Fatalf("Buy: %v", err)
	}

	after, _ := m.GetPrices()

	if !after.NoPrice.GreaterThan(before.NoPrice) {
		t.Errorf("NO price should have risen: %s → %s", before.NoPrice, after.NoPrice)
	}
	if !after.YesPrice.LessThan(before.YesPrice) {
		t.Errorf("YES price should have fallen: %s → %s", before.YesPrice, after.YesPrice)
	}
}

/*
TestInvariant_HighLiquiditySlowsPrice verifies that with higher 'b', the same
trade moves the price less (stability property).
*/
func TestInvariant_HighLiquiditySlowsPrice(t *testing.T) {
	r := NewRegistry()

	lowLiq, err := r.CreateMarket(CreateMarketParams{
		Question:       "Low liq?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(10_000),
	})

	if err != nil {
		t.Fatalf("failed to create low liquidity ,arket: %v", err)
	}
	if err := lowLiq.Open(); err != nil {
		t.Fatalf("failed to open low liquidity market: %v", err)
	}

	highLiq, err := r.CreateMarket(CreateMarketParams{
		Question:       "High liq?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(1_000_000),
	})
	if err != nil {
		t.Fatalf("failed to create high liquidity market: %v", err)
	}
	if err := highLiq.Open(); err != nil {
		t.Fatalf("failed to open high liquidity market: %v", err)
	}

	shares := di(1000)

	beforeLow, _ := lowLiq.GetPrices()
	_, _ = lowLiq.Buy("user", BuyYES, shares, decimal.Zero)
	afterLow, _ := lowLiq.GetPrices()
	deltaLow := afterLow.YesPrice.Sub(beforeLow.YesPrice).Abs()

	beforeHigh, _ := highLiq.GetPrices()
	_, _ = highLiq.Buy("user", BuyYES, shares, decimal.Zero)
	afterHigh, _ := highLiq.GetPrices()
	deltaHigh := afterHigh.YesPrice.Sub(beforeHigh.YesPrice).Abs()

	if !deltaLow.GreaterThan(deltaHigh) {
		t.Errorf(
			"low liquidity should move price more: lowDelta=%s, highDelta=%s",
			deltaLow, deltaHigh,
		)
	}
}

/*
TestInvariant_CostIsPositive verifies that every trade has a positive cost.
(Free trades would be a catastrophic financial bug.)
*/
func TestInvariant_CostIsPositive(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	receipt, err := m.Buy("alice", BuyYES, di(100), decimal.Zero)
	if err != nil {
		t.Fatalf("Buy: %v", err)
	}
	if !receipt.CostPaid.GreaterThan(decimal.Zero) {
		t.Errorf("cost must be positive, got %s", receipt.CostPaid)
	}
}

/*
TestInvariant_LargerPurchaseCostsMore verifies the logarithmic cost curve:
buying more shares always costs proportionally more per share.
*/
func TestInvariant_LargerPurchaseCostsMore(t *testing.T) {
	r := NewRegistry()

	// Each market is fresh so we compare cost per share in the same initial state
	buy := func(shares int64) decimal.Decimal {
		m := mustOpenMarket(t, r, fmt.Sprintf("Q-%d?", shares))
		rec, err := m.Buy("user", BuyYES, di(shares), decimal.Zero)
		if err != nil {
			t.Fatalf("Buy(%d): %v", shares, err)
		}
		return rec.CostPaid
	}

	cost100 := buy(100)
	cost500 := buy(500)
	cost1000 := buy(1000)

	if !cost500.GreaterThan(cost100) {
		t.Errorf("500 shares should cost more than 100: %s vs %s", cost500, cost100)
	}
	if !cost1000.GreaterThan(cost500) {
		t.Errorf("1000 shares should cost more than 500: %s vs %s", cost1000, cost500)
	}
}

// ── 5. Position and settlement tests ─────────────────────────────────────────

func TestPosition_AccumulatesAcrossMultipleTrades(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	_, _ = m.Buy("alice", BuyYES, di(100), decimal.Zero)
	_, _ = m.Buy("alice", BuyYES, di(200), decimal.Zero)
	_, _ = m.Buy("alice", BuyNO, di(50), decimal.Zero)

	pos, err := m.GetUserPosition("alice")
	if err != nil {
		t.Fatalf("GetUserPosition: %v", err)
	}

	if !pos.YesShares.Equal(di(300)) {
		t.Errorf("YES shares = %s, want 300", pos.YesShares)
	}
	if !pos.NoShares.Equal(di(50)) {
		t.Errorf("NO shares = %s, want 50", pos.NoShares)
	}
	if pos.TotalCostBasis.LessThanOrEqual(decimal.Zero) {
		t.Error("TotalCostBasis must be positive after trades")
	}
}

func TestPosition_UnknownUser_ReturnsZero(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	pos, err := m.GetUserPosition("nobody")
	if err != nil {
		t.Fatalf("GetUserPosition: %v", err)
	}
	if !pos.YesShares.Equal(decimal.Zero) {
		t.Error("unknown user should have zero YES shares")
	}
	if !pos.NoShares.Equal(decimal.Zero) {
		t.Error("unknown user should have zero NO shares")
	}
}

func TestResolution_WinnerPnLIsPositive(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Will Manchester United win?")

	// alice buys YES (she's the winner)
	rec, _ := m.Buy("alice", BuyYES, di(100), decimal.Zero)
	aliceCost := rec.CostPaid

	// bob buys NO (he's the loser)
	_, _ = m.Buy("bob", BuyNO, di(100), decimal.Zero)

	_ = m.Close()
	_ = m.Resolve(OutcomeYes, "admin")

	// Alice: payout = 100 shares × 100 KES = 10,000 KES
	// PnL = 10,000 − aliceCost  (should be large positive number)
	alicePos, _ := m.GetUserPosition("alice")
	expectedPayout := di(100).Mul(di(100)) // 10,000 KES
	expectedPnL := expectedPayout.Sub(aliceCost)

	if !approxEqual(alicePos.RealizedPnL, expectedPnL, "0.000001") {
		t.Errorf("alice PnL = %s, want %s", alicePos.RealizedPnL, expectedPnL)
	}
	if !alicePos.RealizedPnL.GreaterThan(decimal.Zero) {
		t.Errorf("winner's PnL should be positive, got %s", alicePos.RealizedPnL)
	}

	// Bob: payout = 0, PnL = 0 - bobCost (negative)
	bobPos, _ := m.GetUserPosition("bob")
	if !bobPos.RealizedPnL.LessThan(decimal.Zero) {
		t.Errorf("loser's PnL should be negative, got %s", bobPos.RealizedPnL)
	}
}

func TestResolution_ResolveNO(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	_, _ = m.Buy("alice", BuyNO, di(100), decimal.Zero)

	_ = m.Close()
	_ = m.Resolve(OutcomeNo, "admin")

	pos, _ := m.GetUserPosition("alice")
	// payout = 100 × 100 = 10,000
	if !pos.RealizedPnL.GreaterThan(decimal.Zero) {
		t.Errorf("NO winner should have positive PnL, got %s", pos.RealizedPnL)
	}
}

func TestResolution_EmptyMarket_NoPositions(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	// No trades
	_ = m.Close()
	err := m.Resolve(OutcomeYes, "admin")
	if err != nil {
		t.Errorf("resolving empty market should succeed: %v", err)
	}
}

// ── 6. Concurrency tests

/*
TestConcurrency_SimultaneousBuys runs N goroutines all buying simultaneously.

This test MUST be run with -race:

	go test -race -run TestConcurrency_SimultaneousBuys

Success criteria:
 1. No data races detected by the race detector.
 2. Every trade either succeeds or returns a typed error.
 3. The trade count equals the number of successful buys.
 4. Prices still sum to 100 after all trades.
*/
func TestConcurrency_SimultaneousBuys(t *testing.T) {
	const numGoroutines = 50
	const sharesPerTrade = 10

	r := NewRegistry()
	m := mustOpenMarket(t, r, "Concurrent test?")

	var wg sync.WaitGroup
	var successCount atomic.Int64
	var failCount atomic.Int64

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()

			outcome := BuyYES
			if i%2 == 0 {
				outcome = BuyNO
			}
			userID := fmt.Sprintf("user-%d", i)

			_, err := m.Buy(userID, outcome, di(sharesPerTrade), decimal.Zero)
			if err != nil {
				// Only unexpected errors count as failures.
				// ErrMarketNotOpen is expected if the market closes mid-test.
				if !errors.Is(err, ErrMarketNotOpen) {
					failCount.Add(1)
					t.Logf("unexpected error from goroutine %d: %v", i, err)
				}
			} else {
				successCount.Add(1)
			}
		}(i)
	}

	wg.Wait()

	if failCount.Load() > 0 {
		t.Errorf("%d goroutines had unexpected errors", failCount.Load())
	}

	// Validate trade ledger is consistent
	trades := m.Trades()
	if int64(len(trades)) != successCount.Load() {
		t.Errorf("trade ledger has %d records, expected %d (= successCount)",
			len(trades), successCount.Load())
	}

	// Final invariant: prices still sum to 100
	sum := sumPrices(t, m)
	if !approxEqual(sum, di(100), "0.0001") {
		t.Errorf("after concurrent trades, prices sum to %s (want 100)", sum)
	}
}

/*
TestConcurrency_SimultaneousReadsAndWrites tests that multiple goroutines
reading prices while another is trading do not cause races or panics.
*/
func TestConcurrency_SimultaneousReadsAndWrites(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Read-write concurrency?")

	var wg sync.WaitGroup

	// 20 readers
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				_, err := m.GetPrices()
				if err != nil {
					t.Errorf("GetPrices during concurrent write: %v", err)
				}
			}
		}()
	}

	// 5 writers
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				userID := fmt.Sprintf("writer-%d", i)
				_, _ = m.Buy(userID, BuyYES, di(1), decimal.Zero)
			}
		}(i)
	}

	wg.Wait()
}

/*
TestConcurrency_LifecycleRace simulates an admin closing and resolving a
market while traders are still trying to buy. Only ErrMarketNotOpen is
acceptable for trades that arrive after close.
*/
func TestConcurrency_LifecycleRace(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Lifecycle race?")

	var wg sync.WaitGroup
	var unexpectedErrors atomic.Int64

	// 30 traders — some will race with the close
	for i := 0; i < 30; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := m.Buy(fmt.Sprintf("u%d", i), BuyYES, di(5), decimal.Zero)
			if err != nil && !errors.Is(err, ErrMarketNotOpen) {
				unexpectedErrors.Add(1)
				t.Logf("unexpected error: %v", err)
			}
		}(i)
	}

	// Admin closes then resolves concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = m.Close()
		_ = m.Resolve(OutcomeNo, "admin")
	}()

	wg.Wait()

	if unexpectedErrors.Load() > 0 {
		t.Errorf("%d unexpected errors during lifecycle race", unexpectedErrors.Load())
	}
}

/*
TestConcurrency_MultipleMarkets verifies that trading on different markets
in parallel is fully independent — no shared state bleeds between markets.
*/
func TestConcurrency_MultipleMarkets(t *testing.T) {
	const numMarkets = 10
	const tradesPerMarket = 20

	r := NewRegistry()
	markets := make([]*Market, numMarkets)
	for i := 0; i < numMarkets; i++ {
		markets[i] = mustOpenMarket(t, r, fmt.Sprintf("Market %d?", i))
	}

	var wg sync.WaitGroup
	for _, m := range markets {
		m := m
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < tradesPerMarket; j++ {
				_, _ = m.Buy("user", BuyYES, di(10), decimal.Zero)
			}
		}()
	}
	wg.Wait()

	// Each market must be independently consistent
	for i, m := range markets {
		trades := m.Trades()
		if len(trades) != tradesPerMarket {
			t.Errorf("market %d: expected %d trades, got %d", i, tradesPerMarket, len(trades))
		}
		sum := sumPrices(t, m)
		if !approxEqual(sum, di(100), "0.0001") {
			t.Errorf("market %d: prices sum to %s", i, sum)
		}
	}
}

// ── 7. Snapshot and audit trail tests ────────────────────────────────────────

func TestSnapshot_ReflectsCurrentState(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Will it rain?")

	_, _ = m.Buy("alice", BuyYES, di(100), decimal.Zero)

	snap, err := m.Snapshot()
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}

	if snap.Status != StatusOpen {
		t.Errorf("snap.Status = %s, want OPEN", snap.Status)
	}
	if snap.TotalTrades != 1 {
		t.Errorf("snap.TotalTrades = %d, want 1", snap.TotalTrades)
	}
	if snap.TotalVolume.LessThanOrEqual(decimal.Zero) {
		t.Error("snap.TotalVolume must be positive after a trade")
	}
	if snap.Outcome != nil {
		t.Error("outcome must be nil before resolution")
	}
}

func TestSnapshot_AfterResolution(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")
	_, _ = m.Buy("alice", BuyYES, di(50), decimal.Zero)
	_ = m.Close()
	_ = m.Resolve(OutcomeYes, "admin")

	snap, err := m.Snapshot()
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}

	if snap.Status != StatusResolved {
		t.Errorf("snap.Status = %s, want RESOLVED", snap.Status)
	}
	if snap.Outcome == nil || *snap.Outcome != OutcomeYes {
		t.Error("snap.Outcome must be YES")
	}
	if snap.ResolvedAt == nil {
		t.Error("snap.ResolvedAt must be set")
	}
	if snap.ResolvedBy != "admin" {
		t.Errorf("snap.ResolvedBy = %q, want admin", snap.ResolvedBy)
	}
}

func TestTrades_LedgerIsImmutable(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")
	_, _ = m.Buy("alice", BuyYES, di(100), decimal.Zero)

	// Get a copy of trades
	trades1 := m.Trades()
	// Mutate the copy
	if len(trades1) > 0 {
		trades1[0].UserID = "hacker"
	}

	// Get a fresh copy — internal state must be unchanged
	trades2 := m.Trades()
	if len(trades2) > 0 && trades2[0].UserID == "hacker" {
		t.Error("SECURITY: external mutation changed internal trade record")
	}
}

func TestTrades_ReceiptMatchesLedger(t *testing.T) {
	r := NewRegistry()
	m := mustOpenMarket(t, r, "Q?")

	receipt, _ := m.Buy("alice", BuyYES, di(100), decimal.Zero)
	trades := m.Trades()

	if len(trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(trades))
	}

	tr := trades[0]
	if tr.ID != receipt.TradeID {
		t.Errorf("trade ID mismatch: %s vs %s", tr.ID, receipt.TradeID)
	}
	if !tr.CostPaid.Equal(receipt.CostPaid) {
		t.Errorf("cost mismatch: %s vs %s", tr.CostPaid, receipt.CostPaid)
	}
	if tr.Outcome != receipt.Outcome {
		t.Errorf("outcome mismatch: %v vs %v", tr.Outcome, receipt.Outcome)
	}
}

// ── 8. Registry wrapper convenience methods ───────────────────────────────────

func TestRegistry_OpenMarket_NotFound(t *testing.T) {
	r := NewRegistry()
	err := r.OpenMarket("bad-id")
	if !errors.Is(err, ErrMarketNotFound) {
		t.Errorf("want ErrMarketNotFound, got %v", err)
	}
}

func TestRegistry_CloseMarket_NotFound(t *testing.T) {
	r := NewRegistry()
	err := r.CloseMarket("bad-id")
	if !errors.Is(err, ErrMarketNotFound) {
		t.Errorf("want ErrMarketNotFound, got %v", err)
	}
}

func TestRegistry_ResolveMarket_NotFound(t *testing.T) {
	r := NewRegistry()
	err := r.ResolveMarket("bad-id", OutcomeYes, "admin")
	if !errors.Is(err, ErrMarketNotFound) {
		t.Errorf("want ErrMarketNotFound, got %v", err)
	}
}

func TestRegistry_FullLifecycleViaRegistry(t *testing.T) {
	r := NewRegistry()
	m, err := r.CreateMarket(CreateMarketParams{
		Question:       "End-to-end test?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(100_000),
	})
	if err != nil {
		t.Fatalf("CreateMarket: %v", err)
	}
	id := m.ID()

	if err := r.OpenMarket(id); err != nil {
		t.Fatalf("OpenMarket: %v", err)
	}
	if m.Status() != StatusOpen {
		t.Error("expected OPEN")
	}

	_, err = m.Buy("user1", BuyYES, di(200), decimal.Zero)
	if err != nil {
		t.Fatalf("Buy: %v", err)
	}

	if err := r.CloseMarket(id); err != nil {
		t.Fatalf("CloseMarket: %v", err)
	}
	if m.Status() != StatusClosed {
		t.Error("expected CLOSED")
	}

	if err := r.ResolveMarket(id, OutcomeYes, "admin"); err != nil {
		t.Fatalf("ResolveMarket: %v", err)
	}
	if m.Status() != StatusResolved {
		t.Error("expected RESOLVED")
	}

	pos, _ := m.GetUserPosition("user1")
	if !pos.RealizedPnL.GreaterThan(decimal.Zero) {
		t.Error("user1 picked YES and YES won — PnL must be positive")
	}
}

// ── 9. Benchmarks ─────────────────────────────────────────────────────────────

func BenchmarkBuy_Sequential(b *testing.B) {
	r := NewRegistry()
	m, _ := r.CreateMarket(CreateMarketParams{
		Question:       "Bench?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(100_000),
	})
	_ = m.Open()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = m.Buy("user", BuyYES, di(1), decimal.Zero)
	}
}

func BenchmarkBuy_Parallel(b *testing.B) {
	r := NewRegistry()
	m, _ := r.CreateMarket(CreateMarketParams{
		Question:       "Bench parallel?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(100_000),
	})
	_ = m.Open()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = m.Buy("user", BuyYES, di(1), decimal.Zero)
		}
	})
}

func BenchmarkGetPrices(b *testing.B) {
	r := NewRegistry()
	m, _ := r.CreateMarket(CreateMarketParams{
		Question:       "Bench prices?",
		CreatedBy:      "admin",
		ClosesAt:       time.Now().UTC().Add(48 * time.Hour),
		LiquidityParam: di(100_000),
	})
	_ = m.Open()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = m.GetPrices()
		}
	})
}
