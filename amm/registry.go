package amm

import (
	"fmt"
	"sync"
)

/*
registry.go - a thread safe dir of all markets

teh registry owns teh map[string]*Market. it has its own RWMutex (mu)
that is entirely separate from each market's own mutex

the separation prevents deadlocks and allows max concurency:
 - Registry.mu protects only map (adding / looking up markets)
 - Market.mu protects teh state of one market

the rule is never hold both locks simultaneously
  acquire reistry.mu -> r/w mao -> release registry.mu -> acquire market.mu for ops on that market

This means two go routines can trade on two diff markets in parallel with zero contention between
*/

/*
markets are never removed

obce a market is in teh map, it stays there. thsi gives us:
 - safe pointer sharing: callers holding a *Market never see it vanish
 - a complete historical record
 - no need to handle market deleted races
*/

/// registry - top level dir for all inary predition markets
// all public methods are thread safe

// create one per process

// registry := amm.NewRegistry()
type Registry struct {
	// mu guards teh markets map only
	// does nt goard market internals
	mu      sync.RWMutex
	markets map[string]*Market
}

// new registry construcst an empty registry
// calls once at start up
func NewRegistry() *Registry {
	return &Registry{
		markets: make(map[string]*Market),
	}
}

/*
CreateMarket validates params, constructs a Market in StatusPending,
registers it, and returns it

teh returned *Market is safe to call methods on immediately, but trades
will be rejected until you call market.Open() (or Registry>OpenMarket)

thread-safe: acquires write lock on reistry fo rteh duration of teh map insertion only.
The market's own lock is not yet needed (it is not yet accessible to other goroutines until we release teh registry lock)
*/
func (r *Registry) CreateMarket(params CreateMarketParams) (*Market, error) {
	// new market validates all params and constructs the market
	// do this before acquiring the registry lock so that if validates fails, we
	// don;t hold teh lock while doing work
	m, err := newMarket(params)
	if err != nil {
		return nil, fmt.Errorf("invalid market params: %w", err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// collision guard
	if _, exists := r.markets[m.id]; exists {
		return nil, fmt.Errorf("%w: id=%s", ErrMarketAlreadyExists, m.id)
	}

	r.markets[m.id] = m

	return m, nil
}

// market lookup
/*
GetMarket returns teh *Market for teh given ID

the caller receives a pointer to teh live market
All subsequent ops are safe because the Market's own
mutex serialises them

thread-safe
*/
func (r *Registry) GetMarket(id string) (*Market, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	m, ok := r.markets[id]
	if !ok {
		return nil, fmt.Errorf("%w: id=%s", ErrMarketNotFound, id)
	}

	return m, nil
}

// ---- convinient lifecycle wrappers ---- //
// are thin wrappers so callers can mnage lifecycle via registry
// without needing to hold a direct market reference

/*
OpenMarket transitions a pending market to a StatusOpen
See Market.Open
*/
func (r *Registry) OpenMarket(id string) error {
	m, err := r.GetMarket(id)
	if err != nil {
		return err
	}

	return m.Open()
}

/*
Close market transitions an open market to STatsusClosed
see Market.Close
*/
func (r *Registry) CloseMarket(id string) error {
	m, err := r.GetMarket(id)
	if err != nil {
		return err
	}

	return m.Close()
}
