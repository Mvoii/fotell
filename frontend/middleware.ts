import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware — server-side route protection.
 *
 * Auth-required routes:  /home, /watchlist, /portfolio, /notifications, /settings
 * Admin-required routes: /admin, /admin/*
 *
 * Token strategy:
 *  - access_token  → stored in a JS-accessible cookie (set by the API client
 *                    after login; name: "access_token")
 *  - refresh_token → httpOnly cookie (name: "refresh_token")
 *
 * Middleware only checks cookie presence (not validity) for the redirect
 * decision. Full JWT verification happens in the API layer; the Axios
 * interceptor in src/lib/api.ts handles silent refresh on 401.
 */

const AUTH_REQUIRED = [
  "/dashboard",
  "/watchlist",
  "/portfolio",
  "/notifications",
  "/settings",
];

const ADMIN_REQUIRED = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAccessToken =
    request.cookies.has("access_token") ||
    request.cookies.has("refresh_token");

  // ── Admin guard ────────────────────────────────────────────────────
  const isAdminRoute = ADMIN_REQUIRED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAdminRoute) {
    if (!hasAccessToken) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Role check (ADMIN) is enforced by the AuthGuard client component
    // and by the API. Middleware can't decode JWT role without a secret here.
    return NextResponse.next();
  }

  // ── Auth guard ─────────────────────────────────────────────────────
  const isAuthRequired = AUTH_REQUIRED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAuthRequired && !hasAccessToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Already-authed users hitting /auth/* → send to /dashboard ──────────
  if (pathname.startsWith("/auth/") && hasAccessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets (fonts, icons)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:woff2?|png|jpg|jpeg|svg|ico)).*)",
  ],
};
