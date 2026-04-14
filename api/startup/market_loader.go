// fotell/api/startup/market_loader.go
package startup

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/Mvoii/fotell/amm"
	"github.com/Mvoii/fotell/api/repository"
	"github.com/shopspring/decimal"
)

/*
market_loader.go - Startup Market Loader

RESPONSIBILITY:
  - Load all OPEN markets from database into AMM registry on server startup
  - Restore market state so trading can continue after server restart
  - Handle errors gracefully without crashing the server

CALLED BY:
  - main.go during server initialization
  - After AMM registry is created but before server starts accepting requests

CRITICAL FOR PRODUCTION:
  - Without this, all OPEN markets become unavailable after server restart
  - Users cannot trade until admin manually re-opens each market
  - This loader makes the system resilient to restarts
*/

// LoadActiveMarkets loads all OPEN markets from the database into the AMM registry.
//
// WORKFLOW:
//  1. Query database for all markets with status=OPEN
//  2. For each market:
//     a. Convert liquidity param from cents to KES decimal
//     b. Create market in AMM registry
//     c. Open the market in AMM
//  3. Log results (success count, failures)
//
// ERROR HANDLING:
//   - Individual market failures are logged but don't stop the process
//   - Server continues to start even if some markets fail to load
//   - Returns error only if critical failures occur (DB connection, etc.)
//
// USAGE:
//
//	if err := startup.LoadActiveMarkets(ctx, marketRepo, ammRegistry); err != nil {
//	    log.Fatalf("CRITICAL: Failed to load active markets: %v", err)
//	}
func LoadActiveMarkets(ctx context.Context, marketRepo *repository.MarketRepository, registry *amm.Registry) error {
	log.Println("Loading OPEN markets from database into AMM registry...")

	// Query database for all OPEN markets
	markets, err := marketRepo.GetAllActive(ctx)
	if err != nil {
		return fmt.Errorf("failed to query active markets: %w", err)
	}

	if len(markets) == 0 {
		log.Println("✓ No OPEN markets found in database (clean slate)")
		return nil
	}

	log.Printf("Found %d OPEN market(s) in database", len(markets))

	// Counters for reporting
	successCount := 0
	failCount := 0

	// Load each market into AMM registry
	for _, market := range markets {
		if err := loadSingleMarket(registry, marketRepo, market); err != nil {
			log.Printf("WARN: Failed to load market %s (%s): %v",
				market.ID, market.Question, err)
			failCount++
			continue
		}

		log.Printf("Loaded market %s: %s", market.ID, market.Question)
		successCount++
	}

	// Report results
	log.Printf("Market loading complete: %d successful, %d failed", successCount, failCount)

	if successCount == 0 && len(markets) > 0 {
		return fmt.Errorf("CRITICAL: Failed to load any markets (%d total)", len(markets))
	}

	return nil
}

// loadSingleMarket loads one market into the AMM registry.
//
// STEPS:
//  1. Convert liquidity param from cents (DB) to KES decimal (AMM)
//  2. Create market in registry (validates params, initializes LSMR engine)
//  3. Open market (transitions from PENDING to OPEN in AMM)
//
// NOTE ON STATE RESTORATION:
//
//	Currently, the LSMR engine initializes with default 50/50 prices.
//	The quantities_state from the database is NOT yet restored.
//
//	TODO for production:
//	  - Add SetQuantities() method to amm.Market
//	  - Parse market.QuantitiesState JSON
//	  - Restore engine quantities so prices are preserved across restarts
//
// This is acceptable for MVP since:
//   - Prices reset to 50/50 on restart
//   - New trades will move prices correctly from that point
//   - Users can still trade (system is functional, just prices reset)
func loadSingleMarket(registry *amm.Registry, marketRepo *repository.MarketRepository, market *repository.Market) error {
	// Check if market has already expired (closes_at in the past)
	// These markets should be closed in DB, not loaded into AMM
	if market.ClosesAt.Before(time.Now().UTC()) {
		log.Printf("Market %s has expired (closes_at: %s), closing in database",
			market.ID, market.ClosesAt.Format(time.RFC3339))

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := marketRepo.UpdateStatus(ctx, market.ID, "CLOSED"); err != nil {
			return fmt.Errorf("failed to close expired market in database: %w", err)
		}
		return nil // Market handled (closed), skip loading
	}

	// Convert liquidity param from cents to KES decimal
	// Database stores: 500000 cents
	// AMM expects: 5000.00 KES
	liquidityParam := decimal.NewFromFloat(float64(market.LiquidityParam) / 100.0)

	// Create market in AMM registry
	// This initializes a new LSMR engine with default 50/50 prices
	ammMarket, err := registry.CreateMarket(amm.CreateMarketParams{
		ID:             market.ID,
		Question:       market.Question,
		CreatedBy:      market.CreatedBy,
		LiquidityParam: liquidityParam,
		ClosesAt:       market.ClosesAt,
	})
	if err != nil {
		// Check if market already exists in registry
		// This can happen if the loader runs multiple times
		if err.Error() == "market id alreadyexists" {
			log.Printf("Market %s already in registry, skipping", market.ID)
			return nil
		}
		return fmt.Errorf("failed to create AMM market: %w", err)
	}

	// Open the market in AMM
	// This transitions status from PENDING to OPEN
	err = ammMarket.Open()
	if err != nil {
		return fmt.Errorf("failed to open AMM market: %w", err)
	}

	// TODO: Restore quantities_state from database
	// if market.QuantitiesState != nil {
	//     quantities := parseQuantitiesJSON(*market.QuantitiesState)
	//     ammMarket.SetQuantities(quantities)  // ← Method doesn't exist yet
	// }

	return nil
}

/*
LoadActiveMarketsAsync loads markets in the background without blocking server startup.

USAGE:

	go startup.LoadActiveMarketsAsync(context.Background(), marketRepo, ammRegistry)

CAUTION:
  - Server starts accepting requests BEFORE markets are loaded
  - First few requests might fail with "market not found"
  - Better for large deployments with hundreds of markets
  - Not recommended for MVP (use synchronous LoadActiveMarkets instead)
*/
func LoadActiveMarketsAsync(ctx context.Context, marketRepo *repository.MarketRepository, registry *amm.Registry) {
	go func() {
		if err := LoadActiveMarkets(ctx, marketRepo, registry); err != nil {
			log.Printf("ERROR: Async market loading failed: %v", err)
		}
	}()
}
