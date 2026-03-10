# Navigation Flow & Routing

> URL structure, page transitions, auth guards, and state-driven navigation rules.

---

## 1. Route Tree

```
/ (root)
├── /                           → Landing Page
├── /auth
│   ├── /auth/login             → Login
│   └── /auth/register          → Register
├── /markets                    → Market List (public)
│   └── /markets/[id]           → Market Detail + Trade Panel (public)
├── /dashboard                  → User Dashboard (auth guard)
├── /portfolio                  → Portfolio & Trade History (auth guard)
│   └── /portfolio/[positionId] → Position Detail (auth guard)
└── /admin                      → Admin Panel (admin guard)
    └── /admin/markets
        └── /admin/markets/create  → Create Market Wizard (admin guard)
```

---

## 2. Route Guards

```
RouteType       Guard Condition              Redirect-to-on-fail
──────────────────────────────────────────────────────────────────
Public          none                         —
Auth-required   isAuthenticated === false    /auth/login?next={currentPath}
Admin-required  user.role !== 'ADMIN'        /dashboard (or 403 page)
```

Implementation: Next.js middleware (`middleware.ts`) reads the JWT from `httpOnly` cookie or `localStorage`. If the token is expired, attempt a silent refresh via `POST /auth/refresh`. If refresh fails, clear tokens and redirect to login.

---

## 3. Navigation Flow Diagram

```
[Landing Page]
     │
     ├─[Sign Up]──────────────────────→ [Register] → [Dashboard]
     │                                                    │
     ├─[Log In]───────────────────────→ [Login]    → [Dashboard]
     │                                                    │
     └─[Browse Markets]───────────────→ [Markets List]    │
                                              │           │
                                              ├──────────────────────────
                                              │
                                         [Market Detail]
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                               (not auth)          (auth + open)
                                    │                   │
                            [Login prompt]       [Trade Panel]
                                                        │
                                                [Confirm Modal]
                                                        │
                                          ┌─────────────┴──────────────┐
                                          │                            │
                                    [Trade Success]            [Trade Failed]
                                          │
                                  [Dashboard / Portfolio update]


[Dashboard]
     │
     ├─[View Market]────────────────→ [Market Detail]
     ├─[Browse Markets]─────────────→ [Markets List]
     └─[View All Activity]──────────→ [Portfolio]


[Admin Panel]  (admin only)
     │
     ├─[+ Create Market]────────────→ [Create Market Wizard]
     │                                         │
     │                               Step 1 → Step 2 → Step 3 → [Admin Panel]
     │
     ├─[Open Market]────────────────→ API call → refresh table row
     ├─[Close Market]───────────────→ API call → refresh table row
     └─[Resolve Market]─────────────→ Resolve Modal → API call → refresh
```

---

## 4. Auth Token Lifecycle

```
Login/Register
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
                         │                    redirect to /auth/login
                         │
Logout
     │
     ├─ POST /auth/logout (with refresh_token from cookie)
     ├─ Clear access_token from Zustand
     └─ Clear refresh_token cookie
     └─ Redirect to /
```

---

## 5. Query Parameter Conventions

| Page | Params | Behaviour |
|---|---|---|
| `/markets` | `?status=OPEN&sort=newest&offset=0` | Filter + pagination |
| `/markets` | `?q=bitcoin` | Text search (client-side filter) |
| `/auth/login` | `?next=/markets/abc` | Redirect after login |
| `/portfolio` | `?tab=history` | Active tab state in URL |

---

## 6. Loading & Error States Per Route

Every data-driven page must implement:

```
[Loading state]
  → Skeleton placeholders matching the final layout
  → Never spinners alone — use full-layout skeletons

[Error state]
  → Inline error card: icon + message + retry button
  → Network errors → "Unable to connect. Retry?"
  → 404 markets → "Market not found" with [Browse Markets] CTA
  → 403 admin pages → "Access denied" with [Back to Dashboard]

[Empty state]
  → Markets list empty → "No markets match your filters" + clear filters button
  → Portfolio empty → "You have no positions yet" + [Browse Markets] CTA
  → Trade history empty → "No trades yet" + [Browse Markets] CTA
```

---

## 7. Toast / Notification System

Global toast provider (top-right, auto-dismiss 4s):

| Event | Toast Type | Message |
|---|---|---|
| Login success | success | "Welcome back, {username}!" |
| Register success | success | "Account created! You have 5,000 KES to start." |
| Trade success | success | "Bought {n} {YES/NO} shares for KES {cost}" |
| Trade slippage | error | "Trade rejected: price moved too much." |
| Market created | success | "Market created. Remember to open it for trading." |
| Market opened | info | "Market is now OPEN for trading." |
| Market resolved | info | "Market resolved: {outcome}. Payouts sent." |
| Network error | error | "Connection lost. Check your internet." |
| Session expired | warning | "Session expired. Please log in again." |
