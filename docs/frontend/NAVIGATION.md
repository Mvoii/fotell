# Navigation Flow & Routing

> **v2** — Updated for 5-tab mobile-first bottom navigation, limit orders, Watchlist,
> and IBKR-style Portfolio with tabbed sub-views.

---

## 1. Route Tree

```
/ (root)
├── /                           → Landing Page (public, no app shell)
├── /auth
│   ├── /auth/login             → Login
│   └── /auth/register          → Register
│
├── /home                       → Home Feed  (auth guard)
│
├── /markets                    → Market List (public)
│   └── /markets/[id]           → Market Detail + Trade Panel (public; trade = auth)
│
├── /watchlist                  → Watchlist  (auth guard)
│
├── /portfolio                  → Portfolio  (auth guard)
│   ├── ?tab=positions          →   Positions tab  (default)
│   ├── ?tab=balances           →   Balances tab
│   ├── ?tab=orders             →   Orders tab
│   │     ├── ?filter=open      →     Open orders (default)
│   │     ├── ?filter=filled    →     Filled orders
│   │     └── ?filter=cancelled →     Cancelled orders
│   └── ?tab=history            →   Trade History tab
│
├── /notifications                  → Notifications Center (auth guard)
│
├── /settings                       → User Settings (auth guard)
│
└── /admin                      → Admin Panel (admin guard)
    └── /admin/markets
        └── /admin/markets/create  → Create Market Wizard (admin guard)
```

---

## 2. Route Guards

```
RouteType       Guard Condition              Redirect-on-fail
──────────────────────────────────────────────────────────────────
Public          none                         —
Auth-required   isAuthenticated === false    /auth/login?next={currentPath}
Admin-required  user.role !== 'ADMIN'        /home (or 403 page)
```

**Implementation:** Next.js `middleware.ts` reads the JWT from `httpOnly` cookie or
`localStorage`. If token is expired, attempt a silent refresh via `POST /auth/refresh`.
If refresh fails, clear tokens and redirect to `/auth/login?next={currentPath}`.

> `/notifications` and `/settings` follow the same `Auth-required` guard as `/home`.

---

## 3. Navigation Flow Diagram

```
[Landing /]
     │
     ├─[Sign Up]────────────────────────→ [Register] ──────→ [Home Feed]
     │                                                            │
     ├─[Log In]─────────────────────────→ [Login] ────────→ [Home Feed]
     │                                                            │
     └─[Browse Markets]─────────────────→ [Markets List]         │
                                               │                 │
                                          [Market Detail]        │
                                               │                 │
                                     ┌─────────┴──────────┐      │
                                (not auth)          (auth + open)│
                                     │                    │      │
                             [Login prompt]       [Trade Panel]  │
                                                       │         │
                                          ┌────────────┴──────┐  │
                                   [Market Order]    [Limit Order]│
                                          │                 │    │
                                   [Confirm Modal]  [Confirm Modal]
                                          │                 │
                                    [Success]          [Order Placed]
                                          │                 │
                                   [Home Feed / Portfolio]──┘

[Home Feed /home]
     │
     ├─[🔔 badge tap]─────────────→ /notifications
     │   └─[notification item]────→ deep link (see §7)
     ├─[Open Position card]──────→ [Market Detail]
     ├─[Open Order cancel]───────→ inline confirm → DELETE /orders/:id
     ├─[View All (positions)]────→ /portfolio?tab=positions
     ├─[View All (orders)]───────→ /portfolio?tab=orders
     └─[Browse Markets]──────────→ /markets

[Markets /markets]
     └─[Market card]─────────────→ [Market Detail /markets/:id]

[Watchlist /watchlist]
     ├─[Market card → Trade]─────→ [Market Detail /markets/:id]
     ├─[Set/Edit Alert]──────────→ Price Alert Bottom Sheet
     └─[Remove]──────────────────→ DELETE watchlist entry → refresh

[Portfolio /portfolio]
     ├─[Positions tab]
     │   ├─[View Market]──────────→ /markets/:id
     │   ├─[Trade More]────────────→ /markets/:id (pre-open trade panel)
     │   └─[Close Position]────────→ Trade Panel (pre-filled opposite side)
     ├─[Balances tab]─────────────→ static summary
     ├─[Orders tab]
     │   ├─[Cancel Order]──────────→ inline confirm → DELETE /orders/:id
     │   └─[Edit Trigger]──────────→ Edit Trigger Bottom Sheet
     └─[History tab]──────────────→ paginated trade list

[Settings /settings]
     ├─[Edit Profile]─────────────→ inline edit form
     ├─[Change Password]──────────→ modal form
     ├─[Slippage / Expiry prefs]──→ persisted in localStorage
     ├─[Notification toggles]─────→ PATCH /users/me/notification-preferences
     └─[Sign Out]─────────────────→ POST /auth/logout → clearAuthState → /

[Admin /admin]
     ├─[+ Create Market]─────────→ /admin/markets/create
     │                                  Step 1 → Step 2 → Step 3 → [Admin]
     ├─[▶ Open Market]────────────→ API PATCH → refresh table
     ├─[⏸ Close Market]───────────→ API PATCH → refresh table
     └─[✓ Resolve Market]─────────→ Resolve Modal → API PATCH → refresh
```

---

## 4. Bottom Navigation — Tab Behaviour

```
Tab         Route          Guard         Trade Tab Behaviour
──────────────────────────────────────────────────────────────────
Home        /home          Auth          Navigate
Markets     /markets       Public        Navigate
Trade       (sheet)        Auth          Opens Global Trade Sheet overlay
Watchlist   /watchlist     Auth          Navigate
Portfolio   /portfolio     Auth          Navigate
```

**Trade tab special behaviour:**
- Does NOT navigate to a `/trade` route
- On tap, slides up the Global Trade Sheet (full-height overlay)
- Sheet contains market search + Trade Panel (Market / Limit tabs)
- Closing the sheet returns user to wherever they were

**Active indicator:** accent-blue icon + label, filled dot below label text.
**Notification badges:** shown on Home (unread alerts count) and Portfolio (pending orders count).

---

## 5. Auth Token Lifecycle

```
Login / Register
     │
     ├─ Store access_token  → memory (Zustand store)  [expires 15 min]
     └─ Store refresh_token → httpOnly cookie          [expires 7 days]
                │
                └── Axios interceptor: on 401 response
                         │
                         ├─ POST /auth/refresh (with refresh cookie)
                         │        │
                         │        ├─ Success → update access_token in memory
                         │        │            retry original request
                         │        │
                         │        └─ Failure → clearAuthState()
                         │                     redirect to /auth/login?next=…
                         │
Logout
     │
     ├─ POST /auth/logout (sends refresh_token cookie)
     ├─ Clear access_token from Zustand
     ├─ Clear refresh_token cookie
     └─ Redirect to /
```

---

## 6. Query Parameter Conventions

| Page / Tab | Params | Behaviour |
|---|---|---|
| `/markets` | `?status=OPEN&sort=newest&offset=0` | Filter + pagination |
| `/markets` | `?q=bitcoin` | Text search |
| `/auth/login` | `?next=/markets/abc` | Redirect after login |
| `/portfolio` | `?tab=positions` | Active tab (default: positions) |
| `/portfolio` | `?tab=orders&filter=open` | Orders sub-filter |
| `/portfolio` | `?tab=history&page=2` | History pagination |
| `/watchlist` | `?alerts=true` | Filter watchlist to items with alerts |
| `/notifications` | `?type=alert\|order\|resolved` | Filter notification list by type |
| `/settings` | `?section=trading` | Scroll-anchor to a settings section |

---

## 7. Deep Link Map (notification → route)

| Notification Event | Deep Link |
|---|---|
| Limit order filled | `/portfolio?tab=orders&filter=filled` |
| Limit order expired | `/portfolio?tab=orders&filter=cancelled` |
| Price alert triggered | `/markets/:id` |
| Market resolved (payout received) | `/portfolio?tab=history` |
| New market created (admin broadcast) | `/markets?status=OPEN` |
| 🔔 bell tap from Home header | `/notifications` |
| ⚙ settings tap from sidebar/nav | `/settings` |

---

## 8. Loading & Error States Per Route

Every data-driven page must implement:

```
[Loading]
  → Full-layout skeleton placeholders matching final layout
  → Never standalone spinners

[Error]
  → Inline error card: icon + message + [Retry] button
  → Network error    → "Unable to connect. Check your internet."
  → 404 markets      → "Market not found" + [Browse Markets] CTA
  → 403 admin pages  → "Access denied" + [Back to Home]
  → Expired session  → toast warning + redirect to /auth/login

[Empty]
  → Contextual empty state (see WIREFRAMES.md §14 table)

[Offline]
  → Persistent top-of-screen banner: "You're offline. Showing cached data."
```

---

## 9. Toast / Notification System

Global toast provider (top-right desktop, top-center mobile, auto-dismiss 4 s).
See full event table in WIREFRAMES.md §15.
