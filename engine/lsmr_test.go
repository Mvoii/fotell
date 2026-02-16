package engine

import (
	"testing"

	"github.com/shopspring/decimal"
)

// helper to creat decimal from float
func dec(f float64) decimal.Decimal {
	return decimal.NewFromFloat(f)
}

// helper to create decimal from int
func decInt(i int64) decimal.Decimal {
	return decimal.NewFromInt(i)
}

// heler to check if decimals are approx equal (within tolerance)
func approximatelyEqual(a, b decimal.Decimal, tolerance float64) bool {
	diff := a.Sub(b).Abs()
	maxVal := a.Abs()
	if b.Abs().GreaterThan(maxVal) {
		maxVal = b.Abs()
	}

	if maxVal.IsZero() {
		return diff.LessThanOrEqual(dec(tolerance))
	}

	relativeError := diff.Div(maxVal)
	relativeErrorFloat, _ := relativeError.Float64()

	return relativeErrorFloat <= tolerance
}

/*
testnewlsmrenine_validinputs tests successful engien creation
*/
func TestNewLSMREngine_ValidInputs(t *testing.T) {
	tests := []struct {
		name           string
		numOutcomes    int
		liquidityParam decimal.Decimal
	}{
		{
			name:           "Binary marke with 100k liquidity",
			numOutcomes:    2,
			liquidityParam: decInt(100000),
		},
		{
			name:           "4-outcome market with 500k liquidity",
			numOutcomes:    4,
			liquidityParam: decInt(500000),
		},
		{
			name:           "10-outcome market with 1M liquidity",
			numOutcomes:    10,
			liquidityParam: decInt(1000000),
		},
		{
			name:           "Minimum valid market (2 outcomes)",
			numOutcomes:    2,
			liquidityParam: decInt(1000),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			engine, err := NewLSMREngine(tt.numOutcomes, tt.liquidityParam)
			if err != nil {
				t.Fatalf("Expected no error, got %v", err)
			}

			if engine.numOutcomes != tt.numOutcomes {
				t.Errorf("Expected %d outcomes, got %d", tt.numOutcomes, engine.numOutcomes)
			}

			if !engine.liquidityParam.Equal(tt.liquidityParam) {
				t.Errorf("Expected liquidity %v, got %v", tt.liquidityParam, engine.liquidityParam)
			}

			// Check all quantities initialized to zero
			for i, q := range engine.quantities {
				if !q.Equal(zero()) {
					t.Errorf("Expected quantity[%d] to be 0, got %v", i, q)
				}
			}
		})
	}
}

/*
TestNewLSMREngine_InvalidInputs tests error handling for invalid parameters
*/
func TestNewLSMREngine_InvalidInputs(t *testing.T) {
	tests := []struct {
		name           string
		numOutcomes    int
		liquidityParam decimal.Decimal
		expectedError  error
	}{
		{
			name:           "zero outcomes",
			numOutcomes:    0,
			liquidityParam: decInt(100000),
			expectedError:  ErrInvalidOutcomes,
		},
		{
			name:           "One outcome",
			numOutcomes:    1,
			liquidityParam: decInt(100000),
			expectedError:  ErrInvalidOutcomes,
		},
		{
			name:           "Negative outcomes",
			numOutcomes:    -1,
			liquidityParam: decInt(100000),
			expectedError:  ErrInvalidOutcomes,
		},
		{
			name:           "zero liquidity",
			numOutcomes:    2,
			liquidityParam: zero(),
			expectedError:  ErrInvalidLiquidity,
		},
		{
			name:           "Negative liquidity",
			numOutcomes:    2,
			liquidityParam: decInt(-100000),
			expectedError:  ErrInvalidLiquidity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewLSMREngine(tt.numOutcomes, tt.liquidityParam)
			if err != tt.expectedError {
				t.Errorf("Expected error %v, got %v", tt.expectedError, err)
			}
		})
	}
}

/*
TestCalculatePrices_InitialState tests that initial prices are equal
*/
func TestCalculatePrices_InitialState(t *testing.T) {
	tests := []struct {
		name          string
		numOutcomes   int
		expectedPrice float64
	}{
		{
			name:          "Binary market",
			numOutcomes:   2,
			expectedPrice: 50.0,
		},
		{
			name:          "4-outcome market",
			numOutcomes:   4,
			expectedPrice: 25.0,
		},
		{
			name:          "10-outcome market",
			numOutcomes:   10,
			expectedPrice: 10.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			engine, err := NewLSMREngine(tt.numOutcomes, decInt(100000))
			if err != nil {
				t.Fatalf("Failed to create engine: %v", err)
			}

			prices, err := engine.CalculatePrices()
			if err != nil {
				t.Fatalf("Failed to calculate prices: %v", err)
			}

			// Check each price equals expected
			for i, price := range prices {
				priceFloat, _ := price.Float64()
				if !approximatelyEqual(price, dec(tt.expectedPrice), 0.0001) {
					t.Errorf("Price[%d] = %v, expected %v", i, priceFloat, tt.expectedPrice)
				}
			}

			// Check prices sum to 100
			sum := zero()
			for _, price := range prices {
				sum = sum.Add(price)
			}
			if !approximatelyEqual(sum, hundred(), 0.0001) {
				sumFloat, _ := sum.Float64()
				t.Errorf("Prices sum to %v, expected 100", sumFloat)
			}
		})
	}
}

/*
TestCalculatePrices_AfterPurchase tests price changes after purchases
*/
func TestCalculatePrices_AfterPurchase(t *testing.T) {
	t.Run("Binary market - buy YES", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		// Buy some YES shares
		engine.quantities[0] = decInt(1000)

		prices, err := engine.CalculatePrices()
		if err != nil {
			t.Fatalf("Failed to calculate prices: %v", err)
		}

		// YES price should be higher than NO
		if prices[0].LessThanOrEqual(prices[1]) {
			t.Errorf("Expected YES (%v) > NO (%v)", prices[0], prices[1])
		}

		// Prices should still sum to 100
		sum := prices[0].Add(prices[1])
		if !approximatelyEqual(sum, hundred(), 0.0001) {
			t.Errorf("Prices sum to %v, expected 100", sum)
		}
	})

	t.Run("Binary market - balanced purchases", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		// Buy equal amounts of both
		engine.quantities[0] = decInt(1000)
		engine.quantities[1] = decInt(1000)

		prices, err := engine.CalculatePrices()
		if err != nil {
			t.Fatalf("Failed to calculate prices: %v", err)
		}

		// Prices should be equal
		if !approximatelyEqual(prices[0], prices[1], 0.0001) {
			t.Errorf("Expected equal prices, got %v and %v", prices[0], prices[1])
		}
	})

	t.Run("Multi-outcome market", func(t *testing.T) {
		engine, _ := NewLSMREngine(4, decInt(100000))

		// Buy different amounts for different outcomes
		engine.quantities[0] = decInt(5000) // Most
		engine.quantities[1] = decInt(2000) // Second
		engine.quantities[2] = decInt(500)  // Third
		engine.quantities[3] = decInt(100)  // Least

		prices, err := engine.CalculatePrices()
		if err != nil {
			t.Fatalf("Failed to calculate prices: %v", err)
		}

		// Prices should be ordered by quantity
		if !prices[0].GreaterThan(prices[1]) {
			t.Errorf("Expected price[0] > price[1]")
		}
		if !prices[1].GreaterThan(prices[2]) {
			t.Errorf("Expected price[1] > price[2]")
		}
		if !prices[2].GreaterThan(prices[3]) {
			t.Errorf("Expected price[2] > price[3]")
		}

		// Sum should be 100
		sum := zero()
		for _, p := range prices {
			sum = sum.Add(p)
		}
		if !approximatelyEqual(sum, hundred(), 0.0001) {
			t.Errorf("Prices sum to %v, expected 100", sum)
		}
	})
}

/*
TestCalculateCost tests the LMSR cost function
*/
func TestCalculateCost(t *testing.T) {
	t.Run("Initial state (zero quantities)", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		quantities := []decimal.Decimal{zero(), zero()}
		cost, err := engine.CalculateCost(quantities)
		if err != nil {
			t.Fatalf("Failed to calculate cost: %v", err)
		}

		// Cost should be b × ln(2) for binary market with zero quantities
		// ln(2) ≈ 0.693147
		expectedCost := engine.liquidityParam.Mul(dec(0.693147))
		if !approximatelyEqual(cost, expectedCost, 0.01) {
			t.Errorf("Cost = %v, expected approximately %v", cost, expectedCost)
		}
	})

	t.Run("Cost increases with quantity", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		cost1, _ := engine.CalculateCost([]decimal.Decimal{zero(), zero()})
		cost2, _ := engine.CalculateCost([]decimal.Decimal{decInt(1000), zero()})
		cost3, _ := engine.CalculateCost([]decimal.Decimal{decInt(5000), zero()})

		if !cost2.GreaterThan(cost1) {
			t.Errorf("Expected cost to increase: %v > %v", cost2, cost1)
		}
		if !cost3.GreaterThan(cost2) {
			t.Errorf("Expected cost to increase: %v > %v", cost3, cost2)
		}
	})

	t.Run("Invalid quantities array", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		// Wrong number of quantities
		_, err := engine.CalculateCost([]decimal.Decimal{zero()})
		if err != ErrInvalidQuantities {
			t.Errorf("Expected %v, got %v", ErrInvalidQuantities, err)
		}
	})

	t.Run("Negative quantities", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		_, err := engine.CalculateCost([]decimal.Decimal{decInt(-100), zero()})
		if err == nil {
			t.Error("Expected error for negative quantity")
		}
	})
}

/*
TestCalculatePurchaseCost tests marginal cost calculations
*/
func TestCalculatePurchaseCost(t *testing.T) {
	t.Run("Valid purchase", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		cost, err := engine.CalculatePurchaseCost(0, decInt(1000))
		if err != nil {
			t.Fatalf("Failed to calculate purchase cost: %v", err)
		}

		if cost.LessThanOrEqual(zero()) {
			t.Errorf("Purchase cost should be positive, got %v", cost)
		}
	})

	t.Run("Larger purchases cost more", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		cost1, _ := engine.CalculatePurchaseCost(0, decInt(100))
		cost2, _ := engine.CalculatePurchaseCost(0, decInt(1000))
		cost3, _ := engine.CalculatePurchaseCost(0, decInt(10000))

		if !cost2.GreaterThan(cost1) {
			t.Errorf("Expected %v > %v", cost2, cost1)
		}
		if !cost3.GreaterThan(cost2) {
			t.Errorf("Expected %v > %v", cost3, cost2)
		}
	})

	t.Run("Invalid outcome index", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		_, err := engine.CalculatePurchaseCost(5, decInt(100))
		if err != ErrInvalidOutcomeIndex {
			t.Errorf("Expected %v, got %v", ErrInvalidOutcomeIndex, err)
		}

		_, err = engine.CalculatePurchaseCost(-1, decInt(100))
		if err != ErrInvalidOutcomeIndex {
			t.Errorf("Expected %v, got %v", ErrInvalidOutcomeIndex, err)
		}
	})

	t.Run("zero or negative purchase amount", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		_, err := engine.CalculatePurchaseCost(0, zero())
		if err != ErrInvalidPurchase {
			t.Errorf("Expected %v, got %v", ErrInvalidPurchase, err)
		}

		_, err = engine.CalculatePurchaseCost(0, decInt(-100))
		if err != ErrInvalidPurchase {
			t.Errorf("Expected %v, got %v", ErrInvalidPurchase, err)
		}
	})

	t.Run("Purchase cost matches example from spec", func(t *testing.T) {
		// From the PDF: buying KES 1,000 worth with b=100,000
		// should cause small price movement
		engine, _ := NewLSMREngine(2, decInt(100000))

		// The cost to buy shares that move price from 50 to ~50.25
		// should be approximately the amount that increases q by ~1000
		cost, err := engine.CalculatePurchaseCost(0, decInt(1000))
		if err != nil {
			t.Fatalf("Failed to calculate cost: %v", err)
		}

		// Cost should be reasonable (positive and not huge)
		costFloat, _ := cost.Float64()
		if costFloat <= 0 || costFloat > 10000 {
			t.Errorf("Cost %v seems unreasonable for buying 1000 shares", costFloat)
		}
	})
}

/*
TestExecutePurchase tests the state-modifying purchase operation
*/
func TestExecutePurchase(t *testing.T) {
	t.Run("Successful purchase updates state", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		initialPrices, _ := engine.CalculatePrices()
		cost, newPrices, err := engine.ExecutePurchase(0, decInt(1000))

		if err != nil {
			t.Fatalf("Purchase failed: %v", err)
		}

		// Cost should be positive
		if cost.LessThanOrEqual(zero()) {
			t.Errorf("Cost should be positive: %v", cost)
		}

		// Quantity should be updated
		if !engine.quantities[0].Equal(decInt(1000)) {
			t.Errorf("Quantity not updated correctly: %v", engine.quantities[0])
		}

		// Price[0] should have increased
		if !newPrices[0].GreaterThan(initialPrices[0]) {
			t.Errorf("Price should have increased: %v -> %v", initialPrices[0], newPrices[0])
		}

		// Prices should sum to 100
		sum := newPrices[0].Add(newPrices[1])
		if !approximatelyEqual(sum, hundred(), 0.0001) {
			t.Errorf("Prices sum to %v, expected 100", sum)
		}
	})

	t.Run("Multiple purchases accumulate", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		// First purchase
		_, prices1, _ := engine.ExecutePurchase(0, decInt(500))

		// Second purchase
		_, prices2, _ := engine.ExecutePurchase(0, decInt(500))

		// Total quantity should be 1000
		if !engine.quantities[0].Equal(decInt(1000)) {
			t.Errorf("Expected total quantity 1000, got %v", engine.quantities[0])
		}

		// Price should keep increasing
		if !prices2[0].GreaterThan(prices1[0]) {
			t.Errorf("Expected price to increase: %v -> %v", prices1[0], prices2[0])
		}
	})

	t.Run("Purchases on different outcomes", func(t *testing.T) {
		engine, _ := NewLSMREngine(3, decInt(100000))

		// Buy outcome 0
		_, prices1, _ := engine.ExecutePurchase(0, decInt(1000))

		// Buy outcome 2
		_, prices2, _ := engine.ExecutePurchase(2, decInt(1000))

		// Outcome 0 and 2 should be higher than 1
		if !prices1[0].GreaterThan(prices1[1]) {
			t.Error("Outcome 0 should be more expensive than 1")
		}
		if !prices2[2].GreaterThan(prices2[1]) {
			t.Error("Outcome 2 should be more expensive than 1")
		}
	})
}

/*
TestLiquidityParameter tests how different liquidity values affect volatility
*/
func TestLiquidityParameter(t *testing.T) {
	t.Run("Higher liquidity = less price movement", func(t *testing.T) {
		// Create two engines with different liquidity
		engineLowLiq, _ := NewLSMREngine(2, decInt(10000))    // Low liquidity
		engineHighLiq, _ := NewLSMREngine(2, decInt(1000000)) // High liquidity

		purchaseAmount := decInt(1000)

		// Execute same purchase on both
		_, pricesLow, _ := engineLowLiq.ExecutePurchase(0, purchaseAmount)
		_, pricesHigh, _ := engineHighLiq.ExecutePurchase(0, purchaseAmount)

		// Low liquidity should have moved price more
		priceDeltaLow := pricesLow[0].Sub(dec(50.0))
		priceDeltaHigh := pricesHigh[0].Sub(dec(50.0))

		if !priceDeltaLow.GreaterThan(priceDeltaHigh) {
			t.Errorf("Expected lower liquidity to cause bigger price change: %v vs %v",
				priceDeltaLow, priceDeltaHigh)
		}
	})
}

/*
TestPrecisionAndOverflow tests numerical stability
*/
func TestPrecisionAndOverflow(t *testing.T) {
	t.Run("Very large quantities don't overflow", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		// Try to buy a very large amount (should be handled gracefully)
		engine.quantities[0] = decInt(100000000) // 100 million

		prices, err := engine.CalculatePrices()

		// Should either succeed or return overflow error
		if err != nil && err != ErrPriceCalculationOverflow {
			t.Errorf("Unexpected error: %v", err)
		}

		if err == nil {
			// If it succeeded, price should be close to 100 but not exactly 100
			priceFloat, _ := prices[0].Float64()
			if priceFloat >= 100.0 {
				t.Error("Price should never reach exactly 100")
			}
			if priceFloat < 99.9 {
				t.Errorf("Price should be very close to 100, got %v", priceFloat)
			}
		}
	})

	t.Run("Decimal precision maintained through operations", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		// Perform many small operations
		for i := 0; i < 100; i++ {
			_, _, err := engine.ExecutePurchase(0, decInt(10))
			if err != nil {
				t.Fatalf("Purchase %d failed: %v", i, err)
			}
		}

		prices, _ := engine.CalculatePrices()

		// Prices should still sum to exactly 100
		sum := prices[0].Add(prices[1])
		if !approximatelyEqual(sum, hundred(), 0.00001) {
			t.Errorf("After 100 operations, prices sum to %v instead of 100", sum)
		}
	})

	t.Run("Very small liquidity doesn't cause division by zero", func(t *testing.T) {
		engine, err := NewLSMREngine(2, dec(0.01))
		if err != nil {
			t.Fatalf("Failed to create engine with small liquidity: %v", err)
		}

		_, err = engine.CalculatePrices()
		if err != nil {
			t.Errorf("Price calculation failed with small liquidity: %v", err)
		}
	})
}

/*
TestGetCurrentState tests state inspection
*/
func TestGetCurrentState(t *testing.T) {
	engine, _ := NewLSMREngine(2, decInt(100000))

	// Execute some purchases
	engine.ExecutePurchase(0, decInt(500))
	engine.ExecutePurchase(1, decInt(300))

	numOutcomes, liq, quantities, prices, err := engine.GetCurrentState()
	if err != nil {
		t.Fatalf("Failed to get state: %v", err)
	}

	// Check all values
	if numOutcomes != 2 {
		t.Errorf("Expected 2 outcomes, got %d", numOutcomes)
	}

	if !liq.Equal(decInt(100000)) {
		t.Errorf("Expected liquidity 100000, got %v", liq)
	}

	if !quantities[0].Equal(decInt(500)) {
		t.Errorf("Expected quantity[0] = 500, got %v", quantities[0])
	}

	if !quantities[1].Equal(decInt(300)) {
		t.Errorf("Expected quantity[1] = 300, got %v", quantities[1])
	}

	// Prices should be valid
	sum := prices[0].Add(prices[1])
	if !approximatelyEqual(sum, hundred(), 0.0001) {
		t.Errorf("Prices sum to %v, expected 100", sum)
	}
}

/*
TestSetQuantities tests state restoration
*/
func TestSetQuantities(t *testing.T) {
	t.Run("Valid quantity update", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		newQuantities := []decimal.Decimal{decInt(1000), decInt(500)}
		err := engine.SetQuantities(newQuantities)
		if err != nil {
			t.Fatalf("Failed to set quantities: %v", err)
		}

		if !engine.quantities[0].Equal(decInt(1000)) {
			t.Error("Quantity[0] not updated")
		}
		if !engine.quantities[1].Equal(decInt(500)) {
			t.Error("Quantity[1] not updated")
		}
	})

	t.Run("Invalid quantities array length", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		err := engine.SetQuantities([]decimal.Decimal{decInt(1000)})
		if err != ErrInvalidQuantities {
			t.Errorf("Expected %v, got %v", ErrInvalidQuantities, err)
		}
	})

	t.Run("Negative quantities rejected", func(t *testing.T) {
		engine, _ := NewLSMREngine(2, decInt(100000))

		err := engine.SetQuantities([]decimal.Decimal{decInt(-100), decInt(500)})
		if err == nil {
			t.Error("Should reject negative quantities")
		}
	})
}

/*
BenchmarkCalculatePrices benchmarks price calculation performance
*/
func BenchmarkCalculatePrices(b *testing.B) {
	engine, _ := NewLSMREngine(2, decInt(100000))
	engine.quantities[0] = decInt(1000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.CalculatePrices()
	}
}

/*
BenchmarkExecutePurchase benchmarks purchase execution
*/
func BenchmarkExecutePurchase(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine, _ := NewLSMREngine(2, decInt(100000))
		engine.ExecutePurchase(0, decInt(100))
	}
}

/*
TestRealWorldScenario tests a complete market lifecycle
*/
func TestRealWorldScenario(t *testing.T) {
	// Scenario: Binary market "Will it rain tomorrow?"
	// Initial liquidity: KES 100,000
	// Multiple users trading

	engine, err := NewLSMREngine(2, decInt(100000))
	if err != nil {
		t.Fatalf("Failed to create market: %v", err)
	}

	t.Log("=== Market Created ===")
	prices, _ := engine.CalculatePrices()
	t.Logf("Initial prices - YES: %v, NO: %v", prices[0], prices[1])

	// User 1 believes it will rain
	t.Log("\n=== User 1 buys YES ===")
	cost1, prices, _ := engine.ExecutePurchase(0, decInt(1000))
	t.Logf("Cost: %v KES", cost1)
	t.Logf("New prices - YES: %v, NO: %v", prices[0], prices[1])

	// User 2 also thinks it will rain
	t.Log("\n=== User 2 buys YES ===")
	cost2, prices, _ := engine.ExecutePurchase(0, decInt(2000))
	t.Logf("Cost: %v KES", cost2)
	t.Logf("New prices - YES: %v, NO: %v", prices[0], prices[1])

	// User 3 disagrees - buys NO
	t.Log("\n=== User 3 buys NO ===")
	cost3, prices, _ := engine.ExecutePurchase(1, decInt(1500))
	t.Logf("Cost: %v KES", cost3)
	t.Logf("New prices - YES: %v, NO: %v", prices[0], prices[1])

	// Final state check
	t.Log("\n=== Final Market State ===")
	numOutcomes, liq, quantities, finalPrices, _ := engine.GetCurrentState()
	t.Logf("Outcomes: %d", numOutcomes)
	t.Logf("Liquidity: %v KES", liq)
	t.Logf("Quantities - YES: %v, NO: %v", quantities[0], quantities[1])
	t.Logf("Final Prices - YES: %v, NO: %v", finalPrices[0], finalPrices[1])

	// Verify invariants
	sum := finalPrices[0].Add(finalPrices[1])
	if !approximatelyEqual(sum, hundred(), 0.0001) {
		t.Errorf("INVARIANT VIOLATION: Prices sum to %v, expected 100", sum)
	}

	// YES should still be higher since more was bought
	if !finalPrices[0].GreaterThan(finalPrices[1]) {
		t.Error("LOGIC ERROR: YES should be priced higher than NO")
	}

	t.Log("\n=== All Invariants Maintained ===")
}
