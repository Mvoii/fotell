package engine

import (
	"testing"

	"github.com/shopspring/decimal"
)


func TestNewLSMREngine(t *testing.T) {
	t.Run("Valid initialization", func(t *testing.T) {
		_, err := NewLSMREngine(2, decimal.NewFromInt(100))
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
	})

	t.Run("Invalid outcomes", func(t *testing.T) {
		_, err := NewLSMREngine(1, decimal.NewFromInt(100))
		if err != ErrInvalidOutcomes {
			t.Errorf("Expected ErrInvalidOutcomes, got %v", err)
		}
	})

	t.Run("Invalid liquidity", func(t *testing.T) {
		_, err := NewLSMREngine(2, decimal.NewFromInt(0))
		if err != ErrInvalidLiquidity {
			t.Errorf("Expected ErrInvalidLiquidity, got %v", err)
		}
	})
}

func TestPricingInvariants(t *testing.T) {
	// Setup a market with 3 outcomes and 500 liquidity
	engine, _ := NewLSMREngine(3, decimal.NewFromInt(500))

	t.Run("Initial prices sum to 100", func(t *testing.T) {
		prices, err := engine.CalculatePrices()
		if err != nil {
			t.Fatal(err)
		}

		sum := decimal.Zero
		for _, p := range prices {
			sum = sum.Add(p)
		}

		if !sum.Equals(decimal.NewFromInt(100)) {
			t.Errorf("Initial prices must sum to 100, got %v", sum)
		}
	})

	t.Run("Price increases after purchase", func(t *testing.T) {
		initialPrices, _ := engine.CalculatePrices()

		// Purchase 100 shares of outcome 0
		_, newPrices, err := engine.ExecutePurchase(0, decimal.NewFromInt(100))
		if err != nil {
			t.Fatal(err)
		}

		if !newPrices[0].GreaterThan(initialPrices[0]) {
			t.Errorf("Price of outcome 0 should have increased. Old: %v, New: %v", initialPrices[0], newPrices[0])
		}

		// Ensure sum is still 100
		sum := decimal.Zero
		for _, p := range newPrices {
			sum = sum.Add(p)
		}
		if !sum.Equals(decimal.NewFromInt(100)) {
			t.Errorf("Prices after purchase must sum to 100, got %v", sum)
		}
	})
}

func TestNumericalStability(t *testing.T) {
	// This tests if the engine can handle large quantities without overflow
	// using the Log-Sum-Exp stabilization
	engine, _ := NewLSMREngine(2, decimal.NewFromInt(10)) // Low liquidity makes overflow easier

	t.Run("Large quantity stability", func(t *testing.T) {
		// 1000 shares with b=10 leads to e^(100), which is massive.
		// If not stabilized, this will fail.
		err := engine.SetQuantities([]decimal.Decimal{
			decimal.NewFromInt(1000),
			decimal.NewFromInt(0),
		})
		if err != nil {
			t.Fatal(err)
		}

		prices, err := engine.CalculatePrices()
		if err != nil {
			t.Errorf("Engine failed on large quantities: %v. (Stability bug)", err)
		}

		// Price for outcome 0 should be near 100
		if prices[0].LessThan(decimal.NewFromInt(99)) {
			t.Errorf("Expected price to be near 100, got %v", prices[0])
		}
	})
}

func TestCostMonotonicity(t *testing.T) {
	engine, _ := NewLSMREngine(2, decimal.NewFromInt(100))

	t.Run("Cost is always positive for purchases", func(t *testing.T) {
		cost, _, err := engine.ExecutePurchase(1, decimal.NewFromInt(50))
		if err != nil {
			t.Fatal(err)
		}

		if !cost.GreaterThan(decimal.Zero) {
			t.Errorf("Purchase cost must be positive, got %v", cost)
		}
	})
}

func TestInputValidation(t *testing.T) {
	engine, _ := NewLSMREngine(2, decimal.NewFromInt(100))

	t.Run("Negative purchase amount", func(t *testing.T) {
		_, _, err := engine.ExecutePurchase(0, decimal.NewFromInt(-10))
		if err == nil {
			t.Error("Expected error for negative purchase amount")
		}
	})

	t.Run("Invalid outcome index", func(t *testing.T) {
		_, _, err := engine.ExecutePurchase(99, decimal.NewFromInt(10))
		if err == nil {
			t.Error("Expected error for out of range outcome index")
		}
	})
}
