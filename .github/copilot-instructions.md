# FoTell – Copilot Coding Agent Instructions

## Project Overview

**FoTell** is a binary prediction markets platform where users buy YES/NO shares on real-world events.  
Prices are calculated by the **LSMR (Logarithmic Market Scoring Rule)** automated-market-maker algorithm.

The repository contains three deployable layers:

| Layer | Directory | Language / Runtime |
|---|---|---|
| Pricing engine | `engine/` | Go (pure computation, no I/O) |
| AMM + market lifecycle | `amm/` | Go |
| REST API server | `api/` | Go 1.24, `go-chi/chi` router |
| Web frontend | `frontend/` | Next.js 14, TypeScript, Tailwind CSS |
| Database migrations | `migrations/` | PostgreSQL SQL |

---

## Repository Layout

```
fotell/
├── engine/           # LSMR pricing maths only (no state, no DB)
│   ├── lsmr.go       # LSMREngine – CalculatePrices, ExecutePurchase, etc.
│   ├── lsmr_test.go  # Unit tests for the engine
│   └── lsmr2_test.go # Invariant tests
├── amm/              # Automated Market Maker – wraps engine with market state
│   ├── market.go     # Market struct: lifecycle + trading
│   ├── registry.go   # Registry: thread-safe map of all markets
│   ├── types.go      # Value types (MarketSnapshot, TradeReceipt, etc.)
│   ├── errors.go     # Sentinel errors
│   └── market_test.go
├── api/
│   ├── main.go       # HTTP server bootstrap, router wiring
│   ├── handlers/     # HTTP request handlers (auth, markets, trades, users)
│   ├── middleware/   # JWT auth, security headers
│   ├── repository/   # PostgreSQL data-access layer (raw sql)
│   └── startup/      # Loads active markets from DB into registry on boot
├── frontend/         # Next.js 14 App Router
│   └── src/
│       ├── app/      # Routes and layouts
│       ├── components/
│       ├── lib/      # API client (axios), utilities
│       ├── store/    # Zustand stores (auth, UI)
│       └── types/    # Shared TypeScript types
├── migrations/
│   └── 001_initial.sql   # Full schema (users, markets, trades, positions, balances)
├── docs/
│   ├── openapi.yaml      # OpenAPI spec for the REST API
│   └── frontend/         # Frontend-specific docs
├── Makefile              # Test, server, DB helpers
└── go.mod                # Go module: github.com/Mvoii/fotell
```

---

## Environment Setup

### Go backend

Copy and populate a `.env` file in the repo root before running the server:

```
DATABASE_URL=postgres://user:password@localhost:5432/fotell?sslmode=disable
JWT_SECRET=<at-least-32-character-random-string>
PORT=8080              # optional, defaults to 8080
ENV=development        # optional, defaults to development
```

Both `DATABASE_URL` and `JWT_SECRET` are **required** – the server will `log.Fatal` if either is missing.  
`JWT_SECRET` must be **≥ 32 characters**.

### Database

```bash
createdb fotell
psql fotell < migrations/001_initial.sql
# or via Makefile:
make db-setup
```

> **Warning:** `migrations/001_initial.sql` contains several typos and minor SQL errors that prevent it from running verbatim. See [Known Issues](#known-issues--pre-existing-bugs) below for details.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Build & Run

### Backend

```bash
# Build
go build ./...

# Run server (requires .env with DATABASE_URL and JWT_SECRET)
go run api/main.go
# or:
make server
```

### Frontend

```bash
cd frontend
npm run dev      # development server on :3000
npm run build    # production build
npm run lint     # ESLint
```

---

## Testing

### Go unit tests

```bash
# Run all Go tests
go test ./...

# Run tests for a specific package
go test ./engine/...
go test ./amm/...

# With verbose output
go test -v ./amm/...

# Run a specific test
go test -run TestLSMREngine_ExecutePurchase ./engine/...
```

### API integration/smoke tests (requires a running server)

```bash
make smoke        # quick smoke test (~5 seconds)
make functional   # comprehensive functional tests (~30 seconds)
make security     # security vulnerability tests
make ci           # smoke + functional (no load test) — suitable for CI
```

The Makefile defaults to `API_URL=http://localhost:8080/api/v1`. Override with:
```bash
make functional API_URL=http://your-server/api/v1
```

---

## Key Design Patterns

### Layered architecture / dependency flow

```
HTTP handler  →  AMM registry/market  →  LSMR engine
     ↓                                      ↑
  Repository (PostgreSQL)          (pure maths, no DB)
```

- **`engine`** is stateless: it has no knowledge of users, DB, or markets. All monetary values use `github.com/shopspring/decimal` (never `float64`).
- **`amm`** wraps the engine inside a thread-safe `Market` struct. Each `Market` has its own `sync.RWMutex`. The `Registry` has a separate mutex (never hold both simultaneously).
- **`api/repository`** is a thin raw-SQL data layer. No ORM.
- **`api/handlers`** wire HTTP to the repository + AMM registry.

### Market lifecycle state machine

```
PENDING → OPEN → CLOSED → RESOLVED
```

- `PENDING`: created but not yet accepting trades.
- `OPEN`: accepting trades; LSMR engine prices update on every buy.
- `CLOSED`: trading halted; can be resolved.
- `RESOLVED`: final outcome recorded; user PnL calculated.

Only admins (role=`ADMIN`) can call `CreateMarket`, `OpenMarket`, `CloseMarket`, `ResolveMarket`.

### Concurrency model

Lock ordering (deadlock prevention):
```
Registry.mu → Market.mu
```
Always fetch the market from the registry first (releases registry lock), then lock the market for the operation.

### Financial precision

All monetary and probability values use `decimal.Decimal` (18 decimal places). The balance is stored in the database as `BIGINT` (smallest unit = 10⁻¹⁸ KES) to avoid float issues.

---

## API Overview

Base URL: `/api/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | public | Health check |
| POST | `/auth/register` | public | Create account (returns JWT + refresh token) |
| POST | `/auth/login` | public | Login |
| POST | `/auth/refresh` | public | Refresh access token |
| POST | `/auth/logout` | JWT | Revoke refresh token |
| GET | `/markets` | public | List all markets |
| GET | `/markets/{id}` | public | Get market details |
| GET | `/markets/{id}/prices` | public | Current YES/NO prices |
| GET | `/markets/{id}/trades` | public | Trade history |
| GET | `/users/me` | JWT | Get own profile |
| GET | `/users/me/balance` | JWT | Get own balance |
| GET | `/users/me/positions` | JWT | Get own positions |
| GET | `/users/me/trades` | JWT | Get own trade history |
| POST | `/markets/{id}/trades` | JWT | Place a trade (buy YES or NO) |
| POST | `/admin/markets` | JWT + Admin | Create market |
| POST | `/admin/markets/{id}/open` | JWT + Admin | Open market |
| POST | `/admin/markets/{id}/close` | JWT + Admin | Close market |
| POST | `/admin/markets/{id}/resolve` | JWT + Admin | Resolve market |

See `docs/openapi.yaml` for the full OpenAPI 3.0 specification.

**JWT tokens**: Access tokens expire in 15 minutes; refresh tokens expire in 7 days.  
**Rate limiting**: 100 req/min (unauthenticated), 200 req/min (authenticated).

---

## Go Module

```
module github.com/Mvoii/fotell
```

Key dependencies:
- `github.com/go-chi/chi/v5` – HTTP router
- `github.com/golang-jwt/jwt/v5` – JWT
- `github.com/shopspring/decimal` – decimal arithmetic
- `github.com/lib/pq` – PostgreSQL driver
- `golang.org/x/crypto` – bcrypt password hashing
- `github.com/go-chi/httprate` – rate limiting
- `github.com/joho/godotenv` – `.env` file loading

---

## Frontend Overview

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (dark-mode first, custom `bg-bg-base` / `text-text-primary` theme)
- **State**: Zustand (`src/store/auth.ts`, `src/store/ui.ts`)
- **Data fetching**: TanStack React Query + Axios (`src/lib/api.ts`)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Font**: Geist (local WOFF, loaded via `next/font/local`)

The existing `.github/nextjs-tailwind.instructions.md` contains additional Next.js / Tailwind coding standards.

---

## Known Issues / Pre-existing Bugs

These bugs exist in the codebase **before** any agent changes. Do not treat them as regressions.

### 1. `amm/market_test.go` – all tests fail
The test helper `mustMarket` calls `Registry.CreateMarket` without setting `ID` in `CreateMarketParams`, but the implementation now requires a non-empty `ID` (the ID must come from the database UUID). All `amm` tests fail with:
```
invalid market params: market ID is required
```

### 2. `engine/lsmr2_test.go` – precision test fails
`TestPricingInvariants/Initial_prices_sum_to_100` fails because the sum of prices is `99.99999999999999` (floating-point rounding in `math.Exp` + `decimal` conversion) instead of exactly `100`.

### 3. `api/repository/markets.go` + `api/handlers/market_handlers.go` – build-time vet errors
Several `log.Printf` calls use `%w` (an error-wrapping directive that only works with `fmt.Errorf`). The `go vet` linter flags these but the code still compiles and runs.

### 4. `migrations/001_initial.sql` – SQL syntax errors
The migration file has various typos that prevent it from running verbatim, including:
- `CREATE EXTENSION OF NOT EXISTS` (should be `CREATE EXTENSION IF NOT EXISTS`)
- Missing commas in `CREATE TABLE users`
- `CONSTRAINTS` / `CONSTRATINT` (misspelled keyword)
- `TIMESTAMPZ` in some places (should be `TIMESTAMPTZ`)
- `ON CASCADE` (should be `ON DELETE CASCADE`)
- `token_hash ARCHAR` (missing `V`)
- `resolved_at TIMESTAMPZ NOT NULL` should be nullable for unresolved markets
- `NEW.updated_at = NOW().;` – stray dot

---

## Common Development Workflows

### Add a new API endpoint

1. Add route in `api/main.go` under the appropriate `r.Route` / `r.Group` block.
2. Add handler method in `api/handlers/` (or create a new file).
3. Add repository method in `api/repository/` if DB access is needed.
4. Update `docs/openapi.yaml`.

### Add a new database table or column

1. Write SQL in `migrations/` (new file, e.g. `002_<name>.sql`).
2. Add corresponding Go struct and repository methods in `api/repository/`.

### Modify the LSMR engine

1. Edit `engine/lsmr.go`.
2. Run `go test ./engine/...` to verify correctness.
3. The AMM (`amm/`) and API (`api/`) consume the engine through `engine.LSMREngine` – changes to the public API require updating callers.

### Run the full stack locally

```bash
# Terminal 1: start the API
make db-setup
make server

# Terminal 2: start the frontend
cd frontend && npm run dev
```
