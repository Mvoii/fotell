// fotell/api/handlers/response.go
package handlers

import (
	"encoding/json"
	"net/http"
)

/*
response.go — HTTP Response Helpers

CONTENT-TYPE:
  - All responses are application/json
  - UTF-8 encoding
  - Proper status codes

ERROR STRUCTURE:
  {
    "error": "Human-readable message",
    "details": {
      "error_code": "MACHINE_READABLE",
      "field": "field_name",
      ...
    }
  }

SUCCESS STRUCTURE:
  - Direct JSON serialization of data
  - No wrapper envelope (REST best practice)
*/

/*
JSON writes a JSON response with the given status code.

USAGE:

	JSON(w, 200, user)
	JSON(w, 201, market)

ENCODING:
  - Automatically sets Content-Type header
  - Handles nil data (empty object)
  - Logs encoding errors (shouldn't happen)
*/
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	if data == nil {
		// Write empty object
		w.Write([]byte("{}"))
		return
	}

	if err := json.NewEncoder(w).Encode(data); err != nil {
		// This should never happen unless data is not JSON-serializable
		// Log the error but don't try to write another response (headers already sent)
		// In production, send to error tracking service (Sentry)
		return
	}
}

/*
ErrorJSON writes an error response with structured details.

USAGE:

	ErrorJSON(w, 400, "Invalid email", map[string]interface{}{
	    "error_code": "INVALID_EMAIL",
	    "field": "email",
	})

	ErrorJSON(w, 500, "Internal server error", nil)

PARAMETERS:
  - statusCode: HTTP status code (400, 401, 403, 404, 500, etc.)
  - message: Human-readable error message
  - details: Machine-readable details (optional)

SECURITY:
  - Never expose stack traces or internal errors to clients
  - Generic "Internal server error" for 500s
  - Detailed errors only for 4xx (client errors)
*/
func ErrorJSON(w http.ResponseWriter, statusCode int, message string, details interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	response := map[string]interface{}{
		"error": message,
	}

	if details != nil {
		response["details"] = details
	}

	json.NewEncoder(w).Encode(response)
}

/*
ValidationErrorJSON writes a 400 response for validation errors.

USAGE:

	ValidationErrorJSON(w, "email", "Invalid email format")

SHORTHAND FOR:

	ErrorJSON(w, 400, message, map[string]interface{}{
	    "error_code": "VALIDATION_ERROR",
	    "field": field,
	})
*/
func ValidationErrorJSON(w http.ResponseWriter, field string, message string) {
	ErrorJSON(w, 400, message, map[string]interface{}{
		"error_code": "VALIDATION_ERROR",
		"field":      field,
	})
}

/*
UnauthorizedJSON writes a 401 response.

USAGE:

	UnauthorizedJSON(w, "Token expired")

COMMON USE CASES:
  - Token expired
  - Token invalid
  - Token missing
  - Wrong credentials
*/
func UnauthorizedJSON(w http.ResponseWriter, message string) {
	ErrorJSON(w, 401, message, map[string]interface{}{
		"error_code": "UNAUTHORIZED",
	})
}

/*
ForbiddenJSON writes a 403 response.

USAGE:

	ForbiddenJSON(w, "Admin access required")

DIFFERENCE FROM 401:
  - 401: Not authenticated (who are you?)
  - 403: Not authorized (you can't do this)
*/
func ForbiddenJSON(w http.ResponseWriter, message string) {
	ErrorJSON(w, 403, message, map[string]interface{}{
		"error_code": "FORBIDDEN",
	})
}

/*
NotFoundJSON writes a 404 response.

USAGE:

	NotFoundJSON(w, "Market not found")

SECURITY:
  - Same response for "doesn't exist" and "no access"
  - Prevents resource enumeration
*/
func NotFoundJSON(w http.ResponseWriter, message string) {
	ErrorJSON(w, 404, message, map[string]interface{}{
		"error_code": "NOT_FOUND",
	})
}

/*
ConflictJSON writes a 409 response.

USAGE:

	ConflictJSON(w, "Email already registered")

COMMON USE CASES:
  - Duplicate resources
  - Race conditions
  - Optimistic locking failures
*/
func ConflictJSON(w http.ResponseWriter, message string, details interface{}) {
	ErrorJSON(w, 409, message, details)
}

/*
InternalErrorJSON writes a 500 response.

USAGE:

	InternalErrorJSON(w)

SECURITY:
  - Generic message (never expose internal details)
  - Log full error server-side
  - Monitor 500 rate (alert if > 0.1%)
*/
func InternalErrorJSON(w http.ResponseWriter) {
	ErrorJSON(w, 500, "Internal server error", map[string]interface{}{
		"error_code": "INTERNAL_ERROR",
	})
}
