# FoTell AMM Layer — Architecture & Design Document

## What This Layer Is

The AMM (Automated Market Maker) layer sits directly on top of the LSMR engine
and adds everything needed for a **real, usable prediction market**:

```
┌─────────────────────────────────────┐
│           API / HTTP layer          │  <- future
├─────────────────────────────────────┤
│         Registry  (registry.go)     │  <- market directory
│         Market    (market.go)       │  <- trades, positions, lifecycle
├─────────────────────────────────────┤
│         LSMR Engine (lsmr.go)       │  <- probability math
└─────────────────────────────────────┘
```

The LSMR engine only knows about maths. The AMM layer knows about:
- Market identity and lifecycle (Pending -> Open -> Closed -> Resolved)
- Who traded, when, at what price, for how much
- Per-user position accounting
- Settlement (payout after resolution)
- Thread safety

---

## Concurrency Design — Why It Works

### The Two-Mutex Model

```
Registry.mu  --> guards only the map[string]*Market
Market.mu    --> guards everything inside one Market
```

These two mutexes are **completely independent**. They are never held
simultaneously (by design — see lock ordering rule below).

**What this buys us:**

Two goroutines trading on two different markets run with **zero contention**
between them. `market-A.mu` and `market-B.mu` are different objects.
Only trades on the *same* market contend.

### Lock Ordering (Deadlock Prevention)

The only rule: if you ever need both locks, acquire **Registry.mu first**.

In practice our code never needs both at once:

```
GetMarket:       acquire Registry.RLock -> copy pointer -> release -> done
Buy:             call GetMarket (no registry lock held) -> acquire Market.Lock -> trade -> release
```

### Why One Mutex Per Market (Not Fine-Grained)

A trade must atomically update three things:
1. LSMR engine quantity vector
2. The trade ledger (append to slice)
3. The user's position aggregate

With fine-grained locking you need all three in a transaction, which is
just a manual re-implementation of a coarser lock; with more bug surface.
One mutex per market is simple, auditable, and fast enough at this scale.

**If you ever need higher throughput on a single market:**
Replace `sync.RWMutex` with a single dedicated goroutine per market +
a channel for trade requests. This is a drop-in architecture change
and does not affect the API surface.

### Race Detector

Every concurrent test must pass under:
```bash
go test -race -v -count=1 ./...
```

`-count=1` disables test caching; cached results hide races.

---

## Market Lifecycle State Machine

```
             CreateMarket()
                  │
                  ▼
            ┌─────────┐
            │ PENDING │  ← review period before going live
            └────┬────┘
                 │  Open()
                 ▼
            ┌──────┐
            │ OPEN │  ← Buy() accepted; prices update on each trade
            └──┬───┘
               │  Close()
               ▼
           ┌────────┐
           │ CLOSED │  ← trading gate; no new Buy() calls accepted
           └───┬────┘
               │  Resolve(outcome, by)
               ▼
          ┌──────────┐
          │ RESOLVED │  ← positions settled; RealizedPnL computed
          └──────────┘
```

**Why a two-step Close then Resolve?**

Without the explicit Close step, a race exists:

```
time ----------------------------------------------------------------->
    trader:   Buy() --- [acquired market lock] ---> updates engine
    admin:    Resolve()  --------------------------------------> settles
```

If the trade's price update and the resolution run concurrently (or the trade
arrives nanoseconds after resolution begins), positions are settled against
wrong prices. The Close gate makes this impossible: once `status == CLOSED`
no new `Buy` calls can enter the critical section.

---

## Trade Atomicity

Inside `Buy()`, under the exclusive write lock:

```
1. Validate inputs
2. Read pre-trade prices (snapshot for receipt)
3. Slippage guard (optional): project cost, abort if > maxCost
4. engine.ExecutePurchase() — LSMR state updated
5. append(m.trades, record)
6. m.positions[userID].YesShares += shares   (or NoShares)
7. m.positions[userID].TotalCostBasis += cost
8. m.totalVolume += cost
9. return TradeReceipt
```

Steps 4–8 are all under the same lock. If step 4 fails (LSMR internally
rolls back), steps 5–8 never execute. If steps 5–8 fail after step 4
succeeds (only possible if generateID() fails; a system-level error),
we return an error and the engine state is permanently inconsistent.

**Production mitigation for the ID-generation failure case:**
Store a pre-computed snapshot of quantities *before* calling
`ExecutePurchase`, and call `SetQuantities` to roll back if the
post-engine steps fail. For the MVP, a crypto/rand failure is catastrophic
regardless and should trigger a circuit breaker.

---

## Slippage Protection

```go
m.Buy(userID, BuyYES, shares, maxCost)
//                             ▲
//                  pass decimal.Zero to disable
```

**Why this matters for a financial exchange:**

Between the moment a user submits an order and the moment it executes,
other trades may have moved the price. Without slippage protection, a user
who expected to pay 5,000 KES might pay 8,000 KES because whale activity
moved the market.

`maxCost` is the user's "I refuse to pay more than X KES for this trade".
We compute the projected cost before mutating the engine. If it exceeds
`maxCost`, we return `ErrTradeWouldExceedMaxCost` - zero engine mutation,
zero side effects.

---

## Settlement (Payout) Calculation

On `Resolve(outcome, by)`:

```
For each UserPosition:
    if outcome == YES:
        payout = position.YesShares × 100 KES
    else:
        payout = position.NoShares × 100 KES

    position.RealizedPnL = payout − position.TotalCostBasis
```

`RealizedPnL` is positive for winners, negative for losers.

This layer **records** payout but does not **transfer** play-money.
Balance management lives one layer higher (in the user/account service
that calls this AMM). Separation of concerns: this layer owns the
market maths; the account layer owns the money.

---

## Immutability Guarantees

| Data | Mutable? | Notes |
|------|----------|-------|
| Market.id, question, createdBy, createdAt, closesAt, liquidityParam |  Never | Set at creation; no lock needed to read |
| Market.status, engine, trades, positions | Under mu | Always modified and read under lock |
| Trade records (once appended) | Never | Append-only ledger; returned as copies |
| MarketSnapshot fields | Never | Deep-copied before returning |
| UserPosition returned by GetUserPosition | Never | Returned as value copy |

External callers **cannot mutate** live market state through any returned value.

---

## What's NOT In This Layer (Deliberately)

| Concern | Where it belongs |
|---------|-----------------|
| User balances / KES accounting | Account service (above AMM) |
| Authentication / authorisation | HTTP middleware (above AMM) |
| Database persistence | Repository layer (wraps AMM or replaces in-memory map) |
| Market auto-close on time | Scheduler / cron (calls CloseMarket) |
| Notifications / WebSocket push | Event bus (subscribes to AMM events) |
| Sell / exit positions | Phase 2 (LSMR sell = negative buy, needs CalculateSellProceeds) |

---

## File Structure

```
amm/
├── errors.go       All sentinel errors — callers switch on these
├── types.go        Enums, value objects, DTOs — no behaviour
├── market.go       Market struct — the thread-safe LSMR wrapper
├── registry.go     Registry — the market directory
├── market_test.go  Comprehensive test suite (unit + concurrent)
├── go.mod          Module definition
└── DESIGN.md       This file
```

---

## Integration Example (HTTP handler sketch)

```go
// main.go (future)
registry := amm.NewRegistry()

// POST /markets
func createMarket(w http.ResponseWriter, r *http.Request) {
    var params amm.CreateMarketParams
    json.NewDecoder(r.Body).Decode(&params)

    m, err := registry.CreateMarket(params)
    if err != nil {
        http.Error(w, err.Error(), 400)
        return
    }
    json.NewEncoder(w).Encode(m.Snapshot())
}

// POST /markets/{id}/trades
func placeTrade(w http.ResponseWriter, r *http.Request) {
    m, err := registry.GetMarket(chi.URLParam(r, "id"))
    if errors.Is(err, amm.ErrMarketNotFound) {
        http.Error(w, "not found", 404)
        return
    }

    var req struct {
        UserID   string          `json:"user_id"`
        Outcome  string          `json:"outcome"` // "YES" or "NO"
        Shares   decimal.Decimal `json:"shares"`
        MaxCost  decimal.Decimal `json:"max_cost"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    outcome := amm.BuyYES
    if req.Outcome == "NO" { outcome = amm.BuyNO }

    receipt, err := m.Buy(req.UserID, outcome, req.Shares, req.MaxCost)
    if errors.Is(err, amm.ErrMarketNotOpen) {
        http.Error(w, "market not open", 409)
        return
    }
    if errors.Is(err, amm.ErrTradeWouldExceedMaxCost) {
        http.Error(w, "slippage exceeded", 409)
        return
    }
    if err != nil {
        http.Error(w, "internal error", 500)
        return
    }

    // Debit user balance here (account service call)
    // accountService.Debit(req.UserID, receipt.CostPaid)

    json.NewEncoder(w).Encode(receipt)
}
```

---

## Testing Commands

```bash
# All tests (unit + integration + invariants)
go test -v ./...

# With race detector (mandatory before every deploy)
go test -race -count=1 ./...

# Benchmarks
go test -bench=. -benchmem ./...

# Coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

---

## Key Design Invariants (always true or it's a bug)

1. `YesPrice + NoPrice == 100` — LSMR mathematical guarantee
2. `price > 0 && price < 100` — no outcome is certain before resolution
3. Every `Trade.CostPaid > 0` — trades are never free
4. `UserPosition.TotalCostBasis == Σ(all trades by that user).CostPaid`
5. After resolution: `UserPosition.RealizedPnL == payout - TotalCostBasis`
6. The trade ledger is append-only and matches the count of successful `Buy()` calls
7. `Market.totalVolume == Σ(all trades).CostPaid`