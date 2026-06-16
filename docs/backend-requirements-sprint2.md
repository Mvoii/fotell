# FoTell Backend Requirements — Sprint 2

> **Audience:** Backend team  
> **Created:** 2026-06-16  
> **Status:** Pending backend implementation  

This document describes the backend changes required to support upcoming FoTell frontend features. Items are ordered by priority.

---

## 1. 🔴 CRITICAL — Market Price Reset Bug

### Problem

Every time the Go API server restarts, all open market prices reset to **50% / 50%** regardless of the actual trading history. Users experience sudden, unexplained price jumps and lose confidence in the platform.

### Root Cause

**File:** `api/startup/market_loader.go` — `loadSingleMarket()` (lines 116–155)

When the server starts, `LoadActiveMarkets` reloads each OPEN market from the database and recreates its AMM engine. However, the LSMR engine is **always initialized with default 50/50 quantities**:

```go
// loadSingleMarket() — line 124
ammMarket, err := registry.CreateMarket(amm.CreateMarketParams{
    ID:             market.ID,
    Question:       market.Question,
    CreatedBy:      market.CreatedBy,
    LiquidityParam: liquidityParam,
    ClosesAt:       market.ClosesAt,
    // ← quantities_state is NOT passed here
})
```

The `TODO` comment documenting this gap is at lines 148–152:

```go
// TODO: Restore quantities_state from database
// if market.QuantitiesState != nil {
//     quantities := parseQuantitiesJSON(*market.QuantitiesState)
//     ammMarket.SetQuantities(quantities)  // ← Method doesn't exist yet
// }
```

### What IS Being Saved

**File:** `api/handlers/trade_handler.go` — `executeTrade()` (lines 574–576)

After every trade, the handler **does** persist AMM state to the `markets.quantities_state` column:

```go
quantitiesJSON := fmt.Sprintf(`{"quantities": [%f, %f]}`, yesPriceFloat, noPriceFloat)
err = h.marketRepo.UpdateQuantitiesStateTx(ctx, tx, params.MarketID, quantitiesJSON)
```

> ⚠️ **Note:** The current implementation stores `yes_price`/`no_price` floats, not the raw LSMR internal quantities (`q[0]`, `q[1]`). To properly restore AMM state, the persisted values must be the **raw LSMR quantities**, not derived prices. This may require updating the snapshot format in `trade_handler.go` as part of this fix.

### Fix Required

**Step 1 — Add `SetQuantities()` to the AMM market type:**

```go
// In amm/market.go (or wherever amm.Market is defined)

// SetQuantities restores the LSMR engine's internal quantity vector from a persisted snapshot.
// This must be called after CreateMarket() and before Open() to restore pre-restart state.
func (m *Market) SetQuantities(q0, q1 float64) error {
    // restore engine internal state
}
```

**Step 2 — Fix the snapshot format in `trade_handler.go` (line 574):**

Store raw LSMR quantities instead of derived prices:

```go
// Before (current — stores derived prices, not engine state):
quantitiesJSON := fmt.Sprintf(`{"quantities": [%f, %f]}`, yesPriceFloat, noPriceFloat)

// After (stores raw LSMR quantities for faithful restoration):
q0, q1 := params.AMMMarket.GetRawQuantities() // ← method to add
quantitiesJSON := fmt.Sprintf(`{"q0": %f, "q1": %f}`, q0, q1)
```

**Step 3 — Restore quantities in `loadSingleMarket()` (market_loader.go):**

```go
func loadSingleMarket(registry *amm.Registry, market *repository.Market) error {
    // ... existing CreateMarket call ...

    // Restore AMM state from persisted snapshot
    if market.QuantitiesState != nil && *market.QuantitiesState != "" {
        var state struct {
            Q0 float64 `json:"q0"`
            Q1 float64 `json:"q1"`
        }
        if err := json.Unmarshal([]byte(*market.QuantitiesState), &state); err == nil {
            if err := ammMarket.SetQuantities(state.Q0, state.Q1); err != nil {
                log.Printf("WARN: Failed to restore quantities for market %s: %v", market.ID, err)
                // Proceed with 50/50 default rather than blocking startup
            }
        }
    }

    // Open AFTER restoring quantities
    return ammMarket.Open()
}
```

### Acceptance Criteria

- After a server restart, market prices for OPEN markets are identical to prices before the restart
- New trades continue to move prices correctly from the restored state
- If `quantities_state` is missing or malformed, the market loads at 50/50 (safe fallback, no crash)

---

## 2. 🟡 MEDIUM — Market Categories

### Problem

The frontend needs to categorise markets (e.g., Sports, Politics, Finance) to support:
- Category filter tabs on the Markets page
- Category badge display on market cards and detail pages
- `GET /markets?category=Sports` filtering

### Database Change

Add a `category` column to the `markets` table:

```sql
ALTER TABLE markets
ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'General';

-- Suggested index for filtering
CREATE INDEX idx_markets_category ON markets(category);
```

### Supported Categories

| Value | Display Label |
|-------|---------------|
| `Sports` | Sports |
| `Politics` | Politics |
| `Entertainment` | Entertainment |
| `Celebrity` | Celebrity / Gossip |
| `Finance` | Finance |
| `Technology` | Technology |
| `Economy` | Economy |
| `General` | General *(default)* |

### API Changes

**1. `GET /markets` — add category filter:**

```
GET /api/v1/markets?status=OPEN&category=Sports&limit=20&offset=0
```

Response shape unchanged — existing `Market` objects gain a new field:

```json
{
  "markets": [
    {
      "id": "uuid",
      "question": "Will Arsenal win the Premier League?",
      "category": "Sports",
      "status": "OPEN",
      "yes_price": 62,
      "no_price": 38,
      "liquidity_param": 5000,
      "closes_at": "2026-08-01T00:00:00Z",
      "created_at": "2026-06-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**2. `POST /admin/markets` — accept category in create payload:**

```json
{
  "question": "Will Arsenal win the Premier League?",
  "category": "Sports",
  "liquidity_param": 5000,
  "closes_at": "2026-08-01T00:00:00Z"
}
```

Validation: reject unknown category values with HTTP 400.

### Acceptance Criteria

- `GET /markets?category=Sports` returns only Sports markets
- `GET /markets` (no filter) returns all markets regardless of category
- `POST /admin/markets` without `category` defaults to `"General"`
- Market objects in all responses include the `category` field

---

## 3. 🟡 MEDIUM — Leaderboard Endpoint

### Problem

The frontend needs a leaderboard page showing top users ranked by trade activity, prediction accuracy, and profit. No leaderboard endpoint exists.

### Proposed API Contract

```
GET /api/v1/leaderboard?type=trades|accuracy|profit&limit=50&offset=0
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `trades` \| `accuracy` \| `profit` | `trades` | Ranking metric |
| `limit` | integer | `50` | Max results (cap at 100) |
| `offset` | integer | `0` | Pagination offset |

**Response Shape:**

```json
{
  "entries": [
    {
      "rank": 1,
      "user_id": "uuid",
      "username": "alice",
      "value": 142,
      "display_value": "142 trades"
    },
    {
      "rank": 2,
      "user_id": "uuid",
      "username": "bob",
      "value": 98,
      "display_value": "98 trades"
    }
  ],
  "type": "trades",
  "total": 320,
  "limit": 50,
  "offset": 0
}
```

### Ranking Definitions

#### `type=trades` — Total Trade Count
```sql
SELECT
    u.id         AS user_id,
    u.username,
    COUNT(t.id)  AS value
FROM users u
JOIN trades t ON t.user_id = u.id
GROUP BY u.id, u.username
ORDER BY value DESC
LIMIT $1 OFFSET $2;
```

#### `type=accuracy` — Winning Outcome Accuracy
Percentage of resolved markets where the user held the winning outcome at resolution time.

```sql
SELECT
    u.id                                               AS user_id,
    u.username,
    ROUND(
        100.0 * SUM(CASE WHEN p.outcome = m.resolved_outcome THEN 1 ELSE 0 END)
               / COUNT(p.id),
        1
    )                                                  AS value
FROM users u
JOIN positions p ON p.user_id = u.id
JOIN markets m   ON m.id = p.market_id AND m.status = 'RESOLVED'
GROUP BY u.id, u.username
HAVING COUNT(p.id) >= 3  -- minimum 3 resolved positions to appear
ORDER BY value DESC
LIMIT $1 OFFSET $2;
```

#### `type=profit` — Total Realized PnL
```sql
SELECT
    u.id                   AS user_id,
    u.username,
    SUM(p.realized_pnl)    AS value   -- stored in cents
FROM users u
JOIN positions p ON p.user_id = u.id
WHERE p.realized_pnl IS NOT NULL
GROUP BY u.id, u.username
ORDER BY value DESC
LIMIT $1 OFFSET $2;
```

> **Note:** `realized_pnl` must be populated in the `positions` table when markets are resolved. Confirm this is handled in the market resolution flow (`api/handlers/market_handler.go` resolve endpoint).

### Security

- **Public endpoint** — no authentication required
- User IDs are exposed (acceptable for a public leaderboard)
- Rate-limit to prevent scraping (suggest 60 req/min per IP)

### Acceptance Criteria

- `GET /leaderboard?type=trades` returns users sorted by total trade count
- `GET /leaderboard?type=accuracy` returns users sorted by win % (min 3 resolved positions)
- `GET /leaderboard?type=profit` returns users sorted by total realized PnL
- Invalid `type` values return HTTP 400
- Pagination via `limit` / `offset` works correctly
- Response always includes `type`, `total`, `limit`, `offset` fields

---

## Summary

| # | Item | Priority | Blocking Frontend Feature |
|---|------|----------|--------------------------|
| 1 | Market Price Reset Fix | 🔴 Critical | Price accuracy on all markets |
| 2 | Market Categories | 🟡 Medium | Category filter tabs, market cards |
| 3 | Leaderboard Endpoint | 🟡 Medium | Leaderboard page |

Please reach out to the frontend team for any API contract clarifications before implementation.
