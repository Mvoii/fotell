# docs(frontend): comprehensive design specification & branch setup

## Summary

Establishes the complete frontend design specification and Git branch structure for the FoTell prediction markets UI — a Next.js application closely inspired by Polymarket's interface.

**Base branch:** `frontend` → **Target:** `main`

---

## What Changed

### New Files (`docs/frontend/`)

| File | Contents |
|---|---|
| `README.md` | Documentation index, tech stack table, backend API summary, branch map |
| `DESIGN_SYSTEM.md` | Colour palette (dark/YES-green/NO-red/accent-blue), typography scale, spacing grid, button variants, input styles, card styles, market-status badges, probability bar spec, chart styling, Tailwind config snippet |
| `WIREFRAMES.md` | Annotated ASCII wireframes for all 9 views: Landing, Login, Register, Markets List, Market Detail + Trade Panel, Trade Confirm Modal (success + slippage-exceeded states), Dashboard, Portfolio, Create Market Wizard, Admin Panel + Resolve Modal; responsive breakpoints |
| `NAVIGATION.md` | Full route tree, auth guard rules, JWT lifecycle (silent refresh flow), navigation flow diagram, query param conventions, per-route loading/error/empty state specs, toast notification catalogue |
| `COMPONENTS.md` | 30+ typed TypeScript component interfaces across `ui/`, `layout/`, `markets/`, `charts/`, `trade/`, `portfolio/`, `admin/`; 7 custom hooks (`useAuthStore`, `useBalance`, `useMarket`, `useTrade`, `usePositions`, `useTradeHistory`, `useTradeEstimate`) |
| `API_INTEGRATION.md` | Axios client with 401-interceptor + silent token refresh, full TypeScript types mirroring OpenAPI schemas, financial unit converters (smallest-unit ↔ KES, BigInt-safe), typed service layer for all 5 API domains (auth/markets/trading/user/admin), TanStack Query key conventions, optimistic update pattern for trade execution, error-extractor utility |
| `BRANCH_STRATEGY.md` | Branch hierarchy, lifecycle steps, naming conventions, Conventional Commits format with all scopes, PR checklist, recommended build order, per-branch environment setup |

### New Branches (all from `frontend`)

```
feat/landing-page
feat/auth
feat/markets-list
feat/market-detail
feat/trade-execution
feat/dashboard
feat/portfolio
feat/create-market
feat/admin
```

---

## Motivation

The FoTell backend is feature-complete with a Go/Chi REST API, LSMR AMM engine, and JWT auth. This PR lays the entire frontend groundwork — design language, component contracts, API integration patterns, and Git workflow — so all 9 feature branches can be developed in parallel without ambiguity.

---

## Design Decisions

**Polymarket-inspired dark aesthetic** — `#0d0f12` base, `#1a1d23` cards, YES = `#00c853`, NO = `#ff1744`, CTA = `#2196f3`. This matches the dense, data-rich look of professional prediction market UIs.

**Smallest-unit financial precision** — The backend represents all monetary values as `int` in units of `1e-18 KES`. The spec includes a BigInt-safe `toKES`/`fromKES` formatter to avoid floating-point drift in the UI.

**TanStack Query for all server state** — Structured query-key conventions with fine-grained invalidation after trades (prices, balance, positions, trade history all refresh atomically).

**Axios interceptor for silent refresh** — Access tokens (15 min) are refreshed transparently via the refresh token (7 days, httpOnly cookie) with a queued-request pattern to avoid race conditions during concurrent requests.

**3-step Create Market wizard** — Matches the `POST /admin/markets` payload structure and keeps the admin UX guided, converting the human-readable `b` parameter to smallest units before dispatch.

---

## Commits

```
adeb63d docs(frontend): add comprehensive frontend design specification
c45e89e feat: add Next.js and Tailwind development standards and instructions
```

---

## Checklist

- [x] Design spec complete and committed to `frontend`
- [x] All 9 feature branches created from `frontend`
- [x] No existing backend files modified
- [x] Documentation follows project conventions
- [ ] `chore/setup-nextjs` — Next.js scaffold (follow-up)
- [ ] Feature branches implemented (tracked in #ISSUE_NUMBER)

---

## Screenshots / Wireframe Preview

See `docs/frontend/WIREFRAMES.md` for full annotated wireframes of all 9 views. Key layout:

```
Market Detail Page (desktop)
┌─────────────────────────────────────┬────────────────────────────┐
│  Market info + probability chart    │  Trade Panel               │
│  (2/3 width)                        │  YES/NO toggle             │
│                                     │  Shares input              │
│  YES ████████████░░░░ 62.5¢         │  Estimated cost            │
│  NO  ░░░░░░░░░░░░████ 37.5¢         │  [Buy YES Shares]          │
│                                     │  Balance: KES 4,500        │
└─────────────────────────────────────┴────────────────────────────┘
```

---

## Labels

`frontend` · `documentation` · `design` · `planning` · `next.js`

## Reviewers

@Mvoii
