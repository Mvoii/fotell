# FoTell Frontend — Documentation Index

> **Prediction Markets Trading App** — Next.js UI inspired by Polymarket's interface

---

## 📁 Documentation Structure

```
docs/frontend/
├── README.md                   ← You are here
├── DESIGN_SYSTEM.md            ← Colors, typography, spacing, component tokens
├── WIREFRAMES.md               ← Detailed wireframes / layout specs for every view
├── NAVIGATION.md               ← Navigation flow, routing tree, state transitions
├── COMPONENTS.md               ← Reusable component catalogue with prop specs
├── API_INTEGRATION.md          ← Frontend ↔ Backend contract, API client design
└── BRANCH_STRATEGY.md          ← Git branch workflow and PR conventions
```

---

## 🌿 Git Branch Structure

```
main
└── frontend                    ← Integration branch for all frontend work
    ├── feat/landing-page       ← Public landing / home page
    ├── feat/auth               ← Login, Register, Forgot Password
    ├── feat/markets-list       ← Browsable market directory
    ├── feat/market-detail      ← Single market view + price chart
    ├── feat/trade-execution    ← Buy/Sell order form + confirmation
    ├── feat/dashboard          ← Authenticated user dashboard
    ├── feat/portfolio          ← Positions, PnL, trade history
    ├── feat/create-market      ← Admin — market creation wizard
    └── feat/admin              ← Admin — market lifecycle management
```

> **Note:** Git prevents a ref named `frontend` from having children under `frontend/feat/…` (namespace conflict). Feature branches follow the `feat/<page>` pattern and are all cut from and merged back into `frontend`.

---

## 🚀 Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR/SSG, file-based routing, RSC |
| Styling | **Tailwind CSS** + shadcn/ui | Utility-first, Polymarket-like dark aesthetic |
| State | **Zustand** | Lightweight global state (auth, balance) |
| Data fetching | **TanStack Query v5** | Caching, background refresh, optimistic updates |
| Charts | **Recharts** | Probability / volume timeline charts |
| Forms | **React Hook Form** + **Zod** | Validated forms matching backend constraints |
| Auth | **JWT** (access + refresh tokens) | Matches existing `/auth/*` API |
| HTTP client | **Axios** with interceptor | Token injection + auto-refresh |

---

## 🎨 Visual Design Direction

The UI takes direct inspiration from **Polymarket**:

- **Dark theme** — near-black backgrounds (`#0d0f12`), card surfaces (`#1a1d23`)
- **Green / Red binary palette** — YES = `#00c853`, NO = `#ff1744`
- **Sharp, dense information layout** — data-heavy cards with tight spacing
- **Accent colour** — electric blue `#2196f3` for CTAs and active states
- **Monospace figures** — all prices, odds, balances in `font-variant-numeric: tabular-nums`
- **Glassmorphism subtle borders** — `border: 1px solid rgba(255,255,255,0.06)`

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for full token reference.

---

## 🔗 Backend API Summary

Base URL: `http://localhost:8080/api/v1`  
Auth: JWT Bearer token

| Domain | Key Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Markets | `GET /markets`, `GET /markets/:id`, `GET /markets/:id/prices`, `GET /markets/:id/trades` |
| Trading | `POST /markets/:id/trades` |
| User | `GET /users/me`, `GET /users/me/balance`, `GET /users/me/positions`, `GET /users/me/trades` |
| Admin | `POST /admin/markets`, `POST /admin/markets/:id/open|close|resolve` |

See [API_INTEGRATION.md](./API_INTEGRATION.md) for full integration design.
