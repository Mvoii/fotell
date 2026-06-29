# ── Stage 1: Build the Go binary ──────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git (needed for go modules that use VCS)
RUN apk add --no-cache git

# Copy dependency files first to leverage Docker layer cache
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire source tree
COPY . .

# Build a statically-linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./api/main.go

# ── Stage 2: Minimal runtime image ────────────────────────────────────────────
FROM alpine:3.20

WORKDIR /app

# ca-certificates for HTTPS calls to Supabase / external services
RUN apk add --no-cache ca-certificates tzdata

# Copy the compiled binary
COPY --from=builder /app/server .

# Copy migrations so the container can run them if needed
COPY migrations/ ./migrations/

EXPOSE 8080

CMD ["./server"]
