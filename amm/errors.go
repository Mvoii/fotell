package amm

import "errors"

/*
errors.go - all amm layer sentinel errors

design:
 - Every error os a package level var so callers can use errors.is() to
 switch on teh exact failure without string matching
 - Errors are grouped by teh subsystem rhat produces them
 - We never return raw strings from public methods; always wrap with fmt.Errorf("context: %w", ErrXxx) so teh stack is clear in logs
*/

// ---- market lifestyle errors ---- //

// ErrmarketNotFound is no returned when a market id doesnot exist in the registry
var ErrMarketNotFound = errors.New("market not found")

// returned if teh registry conatins a markket with
// teh same id (should never happens with UUID)
var ErrMarketAlreadyExists = errors.New("market id alreadyexists")

// is retruned when a trade or proce-impact operation
// attempted on a market that is not StatusOpen
var ErrMarketNotOpen = errors.New("market is not open for trading")

// returned when reolution is attemoted before the market
// has been moved to statusclosed. You must explicitly clsoe a market before resolving
var ErrMarketNotClosed = errors.New("market must be closed before resolution")

// returned when resolution is attempted on an already resolved market
var ErrMarketAlreadyResolved = errors.New("market has already been resolved")

// retruned when OpenMarket is called ona  n already open market
var ErrMarketAlreadyOpen = errors.New("market is alread opem")

// returned when a state machine transition is illegal (trying to go from resolved to open)
var ErrInvalidStatusTransition = errors.New("invalid market status transition")

// --- trade / order errors ---- //

// returned when a user tries to buy zero or null shares
// the min unit is 0.000001 shares (enforced by minshareamount)
var ErrinvalidShareAmount = errors.New("share amount must be greater than zero")

// returned when an outcome value is not YES or NO
var ErrInvalidOutcome = errors.New("outcome must be YES or NO")

// returned when teh computed cost of a trade exceeds the caller-supplied mximum (slippage protection)
var ErrTradeWouldExceedMaxCost = errors.New("trade cost exceeds max acceptable cost")

// --- param / construction errors --- /

// returned when the market question is empty or too long
var ErrInvalidQuestion = errors.New("market question must be between 10 and 500 characters")

// retruned when liquidity param is not positive
var ErrInvalidLiquidityParam = errors.New("liquidity param must be positive")

// returned when an empty user id is supplied
var ErrInvalidUserID = errors.New("user id must not be empty")

// // returned when maret close time is not in the future
var ErrClosesAtInPast = errors.New("market close time must be in the future")

// returned when CloseMarket is called on an already closed market
var ErrmarketAlreadyClosed = errors.New("market is already closed or resolved")
