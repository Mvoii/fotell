// fotell/api/repository/db.go
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

type DBConfig struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

func DefaultDBConfig() *DBConfig {
	return &DBConfig{
		MaxOpenConns:    25,
		MaxIdleConns:    25,
		ConnMaxLifetime: 5 * time.Minute,
	}
}

/*
NewPostgresDB creates a connection pool to PostgreSQL.

PARAMETERS:
  - connectionString: Format postgres://user:pass@host:port/db?params

RETURNS:
  - *sql.DB: Connection pool (safe for concurrent use)
  - error: Connection error

USAGE:

	db, err := NewPostgresDB(os.Getenv("DATABASE_URL"))
	if err != nil {
	    log.Fatal(err)
	}
	defer db.Close()

SSL MODES:
  - disable: Local development only (NEVER production)
  - require: Production (enforces encrypted connection)
  - verify-full: Production with certificate validation
*/
func NewPostgresDB(connectionString string) (*sql.DB, error) {
	return NewPostgresDBWithConfig(connectionString, DefaultDBConfig())
}

/*
NewPostgresDBWithConfig creates a connection pool with custom config.

USAGE:

	config := &DBConfig{
	    MaxOpenConns: 50,  // Higher for production
	    MaxIdleConns: 50,
	    ConnMaxLifetime: 10 * time.Minute,
	}
	db, err := NewPostgresDBWithConfig(connectionString, config)
*/
func NewPostgresDBWithConfig(connectionString string, config *DBConfig) (*sql.DB, error) {
	// Validate connection string
	if connectionString == "" {
		return nil, fmt.Errorf("connection string cannot be empty")
	}

	// Open connection (doesn't actually connect yet)
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(config.MaxOpenConns)
	db.SetMaxIdleConns(config.MaxIdleConns)
	db.SetConnMaxLifetime(config.ConnMaxLifetime)

	// Test connection (this actually connects)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

/*
HealthCheck verifies database is responsive.

USAGE:
  - Health check endpoint
  - Monitoring/alerting
  - Readiness probe (Kubernetes)

RETURNS:
  - nil if healthy
  - error with details if unhealthy
*/
func HealthCheck(db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("database unhealthy: %w", err)
	}

	return nil
}

/*
GetPoolStats returns connection pool statistics.

USAGE:
  - Monitoring dashboards
  - Performance tuning
  - Capacity planning

METRICS:
  - OpenConnections: Currently in use
  - InUse: Active queries
  - Idle: Waiting for queries
*/
func GetPoolStats(db *sql.DB) sql.DBStats {
	return db.Stats()
}
