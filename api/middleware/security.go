// fotell/api/middleware/security.go
package middleware

import (
	"fmt"
	"net/http"
)

/*
security.go

OWASP SECURITY HEADERS:
 - X-Frame-Options: prevent clickjacking
 - X-Content-Type-Options: Prevent MIME sniffing
 - X-XSS-Protection: Enable XSS filter (legacy browsers)
 - Referrer-Policy: Control referrer information
 - Content-Security-Policy: Restrict resource loading
 - Strict-Transport-Security: Force HTTPS (production only)
*/

/*
SecurityHeaders adds OWASP sec to all responses

use r.Use(middleware.SecurityHeaders)
*/
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// mime sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// xss protection
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// referrer policy
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// content Security Policy
		// in prod, customize base on resource needs
		csp := "default-src 'self'; " +
			"script-src 'self'; " +
			"style-src 'self' 'unsafe-inline'; " + // unsafe inline for some css frameworks
			"img-src 'self' data: https:; " + // Allow imgs from https and data URIs
			"font-src 'self'; " +
			"connect-src 'self'; " +
			"frame-ancestors  'none'" // same as X-frame ops: DENY
		w.Header().Set("Content-Security-Policy", csp)

		// HSTS (HTTPS enforcement)
		// w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubdomains; preloaded")

		// prevent caching sensitive data
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")

		next.ServeHTTP(w, r)
	})
}

/*
NoCacheHeaders prevents caching of sensitive responses.

USAGE:

	// Apply to specific routes
	r.With(middleware.NoCacheHeaders).Get("/users/me/balance", handler)

USE CASES:
  - Balance endpoints
  - Position endpoints
  - Personal data endpoints
  - Admin panels

HEADERS SET:
  - Cache-Control: no-store, no-cache, must-revalidate, private
  - Pragma: no-cache (HTTP/1.0 compatibility)
  - Expires: 0
*/
func NoCacheHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		next.ServeHTTP(w, r)
	})
}

/*
AllowCacheHeaders allows caching of public, static responses.

USAGE:

	r.With(middleware.AllowCacheHeaders(3600)).Get("/markets", handler)

USE CASES:
  - Public market listings
  - Static assets
  - Public documentation

PARAMETERS:
  - maxAge: Cache duration in seconds
*/
func AllowCacheHeaders(maxAge int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", maxAge))
			next.ServeHTTP(w, r)
		})
	}
}
