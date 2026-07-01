// fotell/engine/lsmr.go
package engine

import (
	"errors"
	"fmt"
	"math"

	"github.com/shopspring/decimal"
)

/*
lsmr
- guarantees liquidity at all price points
- bounded worst-case loss for the maker
- smooth price disovery based on supply/demand
- naturaal support for binary and multimarket outcomes

cost function: C(q) = b * ln(sigma(e^(q1/b)))
price formula: Pi = e^(q1/b) / sigma(e^(qj/b))

where:
- q1 = quantity of shares purchased for outcome i
- b = liquidity parameter (controls proce olatility)
- Pi = probability/price of outcome i (0-100 scale)
*/

var (
	// ErrInvalidOutcomes indiacates the number of coutcomes is invalid (must be >= 2)
	ErrInvalidOutcomes = errors.New("market must have at least 2 outcomes")

	// ErrInvalidLiquidity indicates the liquidity param is invalid (must be > 0)
	ErrInvalidLiquidity = errors.New("liquidity parameter must be reater than 0")

	// ErrInvalidQuantities indicates the quantities array doesn't match outcomes count
	ErrInvalidQuantities = errors.New("quantities array must match number of outcomes")

	// ErrNegativeQuantity indicates a negative quatity was provided
	ErrNegativeQuantity = errors.New("quantities cannot be negative")

	// ErrInvalidPurchase indicates tan invalid purchase amount
	ErrInvalidPurchase = errors.New("purchase amount must be greater than 0")

	// ErrInvalidOutcomeIndex indicates an incalid outcome index
	ErrInvalidOutcomeIndex = errors.New("outcome index out of range")

	// ErrPriceCalculationOverflow indicates a calculation resulted in overflow
	ErrPriceCalculationOverflow = errors.New("price calculation reslted in overflow")
)

// precision consts for decimanl ops
var (
	// DECIMAL_PLACES defines teh precision for all calculations (18 decimal places)
	// provides sufficiant precision for fiancial calcualtors while avoiding overflow
	DECIMAL_PLACES int32 = 18

	// HUNDRED reps 100 in decimal form (prob scaling)
	//HUNDRED = decimal.NewFromInt(100)

	// ZERO reps 0 decimal form
	//ZERO = decimal.Zero

	// ONE reps 1 in decimal
	//ONE = decimal.NewFromInt(1)
)

func zero() decimal.Decimal {
	return decimal.NewFromInt(0)
}

func one() decimal.Decimal {
	return decimal.NewFromInt(1)
}

func hundred() decimal.Decimal {
	return decimal.NewFromInt(100)
}

/*
teh engine maintains:
- number of outcomes in teh market
- liquidity parameter 'b' (higher b = more stable prices, lower volatility)
- Current qunatities (shares purchased) for each outcomes

thread safety:
this implimentation is not thread safe. Wrap it with mute for concurrent access
*/
type LSMREngine struct {
	numOutcomes    int
	liquidityParam decimal.Decimal

	// quantities tracks the total shares puchased for each outcome
	// index corresponds to outcome index (0, 1, 2, ...)
	// these values accumulate as users buy shares
	// used in teh LSMR formulas to calculate current prices
	quantities []decimal.Decimal
}

/*
NewLSMREngine creates a new lsmr engien instance

prams:
- numOutcomes: number of possible outcomes (must be >= 2)
- liquidityParam: teh 'b' param controlling price volatility (>0)

Returs:
- *LSMREngine: init engine with all quants set to 0
- error: alidation error due to invalid params

Eg:

	engine, err := NewLSMREngine(2, decimal.NewFromInt(100000))
*/
func NewLSMREngine(numOutcomes int, liquidityParam decimal.Decimal) (*LSMREngine, error) {
	if numOutcomes < 2 {
		return nil, ErrInvalidOutcomes
	}

	if liquidityParam.LessThanOrEqual(zero()) {
		return nil, ErrInvalidLiquidity
	}

	quantities := make([]decimal.Decimal, numOutcomes)
	for i := range quantities {
		//quantities[i] = ZERO
		quantities[i] = zero()
	}

	return &LSMREngine{
		numOutcomes:    numOutcomes,
		liquidityParam: liquidityParam,
		quantities:     quantities,
	}, nil
}

/*
CalculatePrices computes teh current market prices for all outcomes

this is teh core pricing func
Pi = e^(q1/b) / sigma(e^(qj/b))

prices represent probs and always:
- rnage from 0 to 100
- sum to exactly 100
- change smooly based on quantity changes

Returns:
- []decimal.Decimal: array of prices (probs) for each outcome
- error: calculation error (overflow, etc)

calculation is performed n high precision using decmmal arithmetic
*/
func (e *LSMREngine) CalculatePrices() ([]decimal.Decimal, error) {
	// calc e^(qi/b) for each outcome
	expTerms := make([]decimal.Decimal, e.numOutcomes)
	//sumExp := ZERO
	sumExp := zero()

	for i := 0; i < e.numOutcomes; i++ {
		// qi / b
		exponent := e.quantities[i].Div(e.liquidityParam)

		// conv to float64 for exp calc
		exponentFloat, _ := exponent.Float64()

		if exponentFloat > 700 {
			return nil, ErrPriceCalculationOverflow
		}

		// e^(qi/b)
		expValue := math.Exp(exponentFloat)

		// check for inf or NaN
		if math.IsInf(expValue, 0) || math.IsNaN(expValue) {
			return nil, ErrPriceCalculationOverflow
		}

		expTerms[i] = decimal.NewFromFloat(expValue)

		sumExp = sumExp.Add(expTerms[i])
	}

	// calc normalized probs
	// Pi = e^(qi/b) / sigma(e^(qi/b))
	prices := make([]decimal.Decimal, e.numOutcomes)

	for i := 0; i < e.numOutcomes; i++ {
		// div each exp term by sum to get prob
		probability := expTerms[i].Div(sumExp)

		// scale 0-100
		prices[i] = probability.Mul(hundred())

		// round to defined precisin to prevent accumulation of rounding errors
		prices[i] = prices[i].Round(DECIMAL_PLACES)
	}

	return prices, nil
}

/*
CalculateCost copmutes the total cost to reachh a given quantity state

this implemments the lsmr cost func:
C(q) = b * ln(sigma(e^(qi/b)))

teh cost func is used to
- calc how much a user pays to buy shares
- determine payout when selling shares
- Ensure market maker's bounded loss property

Params:
- quantities: target qunatity state for each outcome

Returns:
- decimal.Decimal: total cost to reach teh specufied state
- error: Calculation error

cost increases logarithmically, which provides teh "boundued loss"
property that makes lsmr suitable for predictaion markets
*/
func (e *LSMREngine) CalculateCost(quantities []decimal.Decimal) (decimal.Decimal, error) {
	if len(quantities) != e.numOutcomes {
		return zero(), ErrInvalidQuantities
	}

	for i, q := range quantities {
		if q.LessThan(zero()) {
			return zero(), fmt.Errorf("%w: outcome %d has negative qunatity", ErrNegativeQuantity, i)
		}
	}

	// calculate sigma(e^(qi/b))
	sumExp := zero()

	for i := 0; i < e.numOutcomes; i++ {
		// qi / b
		exponent := quantities[i].Div(e.liquidityParam)
		exponentFloat, _ := exponent.Float64()

		if exponentFloat > 700 {
			return zero(), ErrPriceCalculationOverflow
		}

		// e^(qi/b)
		expValue := math.Exp(exponentFloat)

		if math.IsInf(expValue, 0) || math.IsNaN(expValue) {
			return zero(), ErrPriceCalculationOverflow
		}

		sumExp = sumExp.Add(decimal.NewFromFloat(expValue))
	}

	// b * ln(sum)
	sumFloat, _ := sumExp.Float64()

	if sumFloat <= 0 {
		return zero(), errors.New("invalid sum for log")
	}

	lnSum := math.Log(sumFloat)

	if math.IsInf(lnSum, 0) || math.IsNaN(lnSum) {
		return zero(), ErrPriceCalculationOverflow
	}

	// lnsum * b
	cost := e.liquidityParam.Mul(decimal.NewFromFloat(lnSum))

	return cost.Round(DECIMAL_PLACES), nil
}

/*
CalculatePurchaseCost computes teh cost to purchase aditional shares

this calculates teh marinal cost of buying more shares:
Cost = C(q_new) - C(q_current)

Where:
- q_current = current quantity state
- q_new = current state + purchase power

Params:
- outcomeIndex: which outcome to buy (0-indexed)
- amount: number of shares to purchase (must be > 0)

Returns:
- decimal.Decimal: Cost to purchase teh specified shares
- error: Validation or calculation error

what users pay when they buy shares in teh marke
*/
func (e *LSMREngine) CalculatePurchaseCost(outcomeIndex int, amount decimal.Decimal) (decimal.Decimal, error) {
	if outcomeIndex < 0 || outcomeIndex >= e.numOutcomes {
		return zero(), ErrInvalidOutcomeIndex
	}

	if amount.LessThanOrEqual(zero()) {
		return zero(), ErrInvalidPurchase
	}

	currentCost, err := e.CalculateCost(e.quantities)
	if err != nil {
		return zero(), fmt.Errorf("failed to calculate current cost: %w", err)
	}

	// create new quantity state after purchase
	newQuantities := make([]decimal.Decimal, e.numOutcomes)
	copy(newQuantities, e.quantities)
	newQuantities[outcomeIndex] = newQuantities[outcomeIndex].Add(amount)

	// new cost sfter purchase
	newCost, err := e.CalculateCost(newQuantities)
	if err != nil {
		return zero(), fmt.Errorf("failed to calculate new cost: %w", err)
	}

	// purchcase cost is teh diff
	purchaseCost := newCost.Sub(currentCost)

	return purchaseCost.Round(DECIMAL_PLACES), nil
}

/*
ExecutePurchase updates the engine state after a purchase

the method:
1. calculates the cost of purchase
2. Updates teh quantity state
3. Returns teh new prices

params:
- outcomIndex: which outcome to buy
- amount: Number of shares to purchase

Returns:
- purhcaseCost: amount the user must pay
- newPrices: Updated prices after the purchase
- error: validation or calculation error

IMPORTANT: tehis mods eh engine staet, Ensures proper transaction handling in teh calling code (rollback on error)
*/
func (e *LSMREngine) ExecutePurchase(outcomeIndex int, amount decimal.Decimal) (purchaseCost decimal.Decimal, newPrices []decimal.Decimal, err error) {
	cost, err := e.CalculatePurchaseCost(outcomeIndex, amount)
	if err != nil {
		return zero(), nil, err
	}

	// update quantities state
	e.quantities[outcomeIndex] = e.quantities[outcomeIndex].Add(amount)

	// calcualte new prices
	prices, err := e.CalculatePrices()
	if err != nil {
		// roll back
		e.quantities[outcomeIndex] = e.quantities[outcomeIndex].Sub(amount)
		return zero(), nil, fmt.Errorf("failed to calculate new prices: %w", err)
	}

	return cost, prices, nil
}

/*
GetCurrentState returns a snapshot of teh current engine state

Returns:
- numOutcomes: number of outcomes
- liquidityParam: teh liquidty param (b)
- quantities: copy of current quantities
- prices: Current market prices

method is read only and safe to call concurrently (assumming no concurrent writes)
*/
func (e *LSMREngine) GetCurrentState() (numOutcomes int, liquidityParam decimal.Decimal, quantities []decimal.Decimal, prices []decimal.Decimal, err error) {
	quantitiesCopy := make([]decimal.Decimal, e.numOutcomes)
	copy(quantitiesCopy, e.quantities)

	prices, err = e.CalculatePrices()
	if err != nil {
		return 0, zero(), nil, nil, err
	}

	return e.numOutcomes, e.liquidityParam, quantitiesCopy, prices, nil
}

/*
setqunatities updates the qunatity state (acution)
provided for:
- State restoration from database
- admin corrections
- testing

CAUTION: this bypasses normal validation. Only use when you know the state is valid

params:
- quantitiees: new quantity state

Returns:
- error: Validation error
*/
func (e *LSMREngine) SetQuantities(quantities []decimal.Decimal) error {
	if len(quantities) != e.numOutcomes {
		return ErrInvalidQuantities
	}

	for i, q := range quantities {
		if q.LessThan(zero()) {
			return fmt.Errorf("%w: coutcome %d", ErrNegativeQuantity, i)
		}
	}

	copy(e.quantities, quantities)

	return nil
}

/*
CalculateSellPayout computes the payout for selling shares

Cost = C(q_current) - Cq_new)
*/
func (e *LSMREngine) CalculateSellPayout(outcomeIndex int, amount decimal.Decimal) (decimal.Decimal, error) {
	if outcomeIndex < 0 || outcomeIndex >= e.numOutcomes {
		return zero(), ErrInvalidOutcomeIndex
	}
	if amount.LessThanOrEqual(zero()) {
		return zero(), ErrInvalidPurchase
	}

	currentCost, err := e.CalculateCost(e.quantities)
	if err != nil {
		return zero(), fmt.Errorf("failed to calculate current cost: %w", err)
	}

	// Create new quantity state after sale
	newQuantities := make([]decimal.Decimal, e.numOutcomes)
	copy(newQuantities, e.quantities)
	newQuantities[outcomeIndex] = newQuantities[outcomeIndex].Sub(amount)

	newCost, err := e.CalculateCost(newQuantities)
	if err != nil {
		// If quantities drop below zero, CalculateCost will natively block it
		return zero(), fmt.Errorf("failed to calculate new cost: %w", err)
	}

	payout := currentCost.Sub(newCost)

	return payout.Round(DECIMAL_PLACES), nil
}

/*
ExecuteSell updates engine state after a sale
*/
func (e *LSMREngine) ExecuteSell(outcomeIndex int, amount decimal.Decimal) (payout decimal.Decimal, newPrices []decimal.Decimal, err error) {
	payout, err = e.CalculateSellPayout(outcomeIndex, amount)
	if err != nil {
		return zero(), nil, err
	}

	// update quant state
	e.quantities[outcomeIndex] = e.quantities[outcomeIndex].Sub(amount)

	prices, err := e.CalculatePrices()
	if err != nil {
		e.quantities[outcomeIndex] = e.quantities[outcomeIndex].Add(amount)

		return zero(), nil, fmt.Errorf("failed to calculate new prices: %w", err)
	}

	return payout, prices, nil
}
