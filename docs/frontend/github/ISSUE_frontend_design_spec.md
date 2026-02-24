# [Frontend] Design Specification & Branch Setup for Prediction Markets UI

## Summary

This issue tracks the planning and documentation phase of the FoTell prediction markets frontend. Before any code is written, a comprehensive design specification has been produced — covering visual design, page wireframes, component contracts, navigation flow, API integration patterns, and the Git branch strategy. This spec is the source of truth that all feature branches (`feat/*`) will implement against.

---

## Background & Motivation

FoTell has a fully-designed backend (Go/Chi REST API) with:
- LSMR automated market maker engine
- Binary prediction markets (YES/NO outcomes)
- JWT auth (access + refresh tokens)
- Market lifecycle: `PENDING → OPEN → CLOSED → RESOLVED`

The frontend needs to expose all of this in a trader-friendly UI closely inspired by **Polymarket's interface** — dark theme, dense market cards, binary probability bars, real-time price charts, and a clean trade execution flow.

---

## What This Issue Covers

### ✅ Completed (on `frontend` branch)

| Deliverable | File | Description |
|---|---|---|
| Design System | `docs/frontend/DESIGN_SYSTEM.md` | Full colour palette, typography scale, spacing grid, button variants (Primary / YES / NO / Danger / Ghost / Icon), input styles, card styles, badge specs, chart styling, Tailwind config snippet |
| Wireframes | `docs/frontend/WIREFRAMES.md` | Annotated ASCII wireframes for all 9 views + responsive breakpoint table |
| Navigation | `docs/frontend/NAVIGATION.md` | Route tree, auth guards, JWT lifecycle, query param conventions, loading/error/empty states, toast catalogue |
| Components | `docs/frontend/COMPONENTS.md` | 30+ typed component interfaces across `ui/`, `layout/`, `markets/`, `charts/`, `trade/`, `portfolio/`, `admin/`; 7 custom hooks |
| API Integration | `docs/frontend/API_INTEGRATION.md` | Axios client with silent token refresh, full TypeScript types (mirrors OpenAPI), financial unit converters, typed service layer, TanStack Query key conventions, optimistic updates, error handling pattern |
| Branch Strategy | `docs/frontend/BRANCH_STRATEGY.md` | Branch hierarchy, lifecycle, naming conventions, Conventional Commits format, PR checklist, recommended build order |
| Dev Standards | `.github/` (instructions) | Next.js + Tailwind coding standards |

### 🔲 Pending (child issues / feature branches)

Each row below should become its own implementation issue:

| Branch | Scope |
|---|---|
| `chore/setup-nextjs` | Scaffold `frontend/` directory — Next.js 14 App Router, Tailwind CSS, shadcn/ui, Axios, TanStack Query, Zustand, Recharts, Zod, React Hook Form |
| `feat/auth` | Login page, Register page, JWT store, silent refresh interceptor |
| `feat/markets-list` | Market directory, filter/search, MarketCard, ProbabilityBar, pagination |
| `feat/market-detail` | Market detail layout, PriceChart (Recharts), trade history table |
| `feat/trade-execution` | TradePanel, TradeConfirmModal, slippage guard, success/error states |
| `feat/dashboard` | Authenticated dashboard — balance stats, open positions, activity feed |
| `feat/portfolio` | Positions tab, trade history tab, PnL calculations |
| `feat/create-market` | 3-step admin wizard, Zod validation, smallest-unit conversion |
| `feat/admin` | Admin market table, lifecycle action buttons, resolve modal |
| `feat/landing-page` | Public hero, featured markets strip, how-it-works section |

---

## Tech Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR/SSG, file-based routing, RSC support |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, matches Polymarket dark aesthetic |
| State | Zustand | Lightweight; only auth + UI state are global |
| Data fetching | TanStack Query v5 | Caching, background refresh, optimistic updates |
| Charts | Recharts | Composable, well-typed, works with SSR |
| Forms | React Hook Form + Zod | Validated forms mirroring backend constraints |
| HTTP | Axios with interceptor | Token injection + silent refresh on 401 |

---

## Design Highlights

- **Dark theme**: `#0d0f12` base, `#1a1d23` cards
- **Binary colours**: YES = `#00c853` (green), NO = `#ff1744` (red)
- **Accent**: `#2196f3` electric blue for all CTAs
- **Monospace numerics**: all prices/balances use `font-mono tabular-nums`
- **Probability bar**: full-width two-tone bar (green left / red right, proportional to YES price)
- **Price chart**: Recharts AreaChart, YES + NO area lines with tinted fills, dark grid

---

## Acceptance Criteria

- [x] All 6 design spec documents written and committed to `frontend`
- [x] 9 feature branches created from `frontend`
- [ ] `chore/setup-nextjs` merged into `frontend` (unblocks all other branches)
- [ ] All feature branches implemented, reviewed, and merged into `frontend`
- [ ] `frontend` passes `next build` with zero TypeScript and ESLint errors
- [ ] All pages mobile-responsive at 375px
- [ ] PR `frontend` → `main` opened and approved

---

## Labels

`frontend` · `documentation` · `design` · `planning` · `next.js` · `enhancement`

## Milestone

`v1.0 — Frontend MVP`

## Assignees

@Mvoii
