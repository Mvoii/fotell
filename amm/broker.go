// fotell/amm/broker.go
package amm

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/lib/pq"
)

// PriceUpdate matches JSON paylod gen by postgres
type PriceUpdate struct {
	MarketID  string    `json:"market_id"`
	YesPrice  float64   `json:"yes_price"`
	NoPrice   float64   `json:"no_price"`
	Timestamp time.Time `json:"timestamp"`
}

// broker manages postgres notifs and routes them to sse clients
type Broker struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan PriceUpdate]struct{}
	listener    *pq.Listener
}

func NewBroker(dbURL string) *Broker {
	// config auto reconn intervals for pg listener
	minReconn := 1 * time.Second
	maxReconn := time.Minute

	reportEvent := func(ev pq.ListenerEventType, err error) {
		if err != nil {
			log.Printf("PG listener Error: %v", err)
		}
	}

	listener := pq.NewListener(dbURL, minReconn, maxReconn, reportEvent)

	b := &Broker{
		subscribers: make(map[string]map[chan PriceUpdate]struct{}),
		listener:    listener,
	}

	// start listening to channel
	err := listener.Listen("market_price_updates")
	if err != nil {
		log.Fatalf("failed to listen to market_price_updates: %v", err)
	}

	// start the bg dispatcher
	go b.dispatcherEvents()

	return b
}

// continuously reads from teh pg listener and fans out messages
func (b *Broker) dispatcherEvents() {
	for {
		select {
		case notification := <-b.listener.Notify:
			if notification == nil {
				continue
			}

			var update PriceUpdate
			err := json.Unmarshal([]byte(notification.Extra), &update)
			if err != nil {
				log.Printf("failed to unmarshal pg notifications: %v", err)
				continue
			}

			b.Publish(update)

		case <-time.After(90 * time.Second):
			// ping the conn to keep it alive
			go b.listener.Ping()
		}
	}
}

// subscribe returns a channel taht recives updates for a spec market
func (b *Broker) Subscribe(marketID string) chan PriceUpdate {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan PriceUpdate, 10)
	if _, ok := b.subscribers[marketID]; !ok {
		b.subscribers[marketID] = make(map[chan PriceUpdate]struct{})
	}
	b.subscribers[marketID][ch] = struct{}{}

	return ch
}

// unsub safely removes a client's channel
func (b *Broker) Unsubscribe(marketID string, ch chan PriceUpdate) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if subs, ok := b.subscribers[marketID]; ok {
		delete(subs, ch)
		close(ch)

		if len(subs) == 0 {
			delete(b.subscribers, marketID)
		}
	}
}

// publis routes an update to all chans subbed to that market
func (b *Broker) Publish(update PriceUpdate) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if subs, ok := b.subscribers[update.MarketID]; ok {
		for ch := range subs {
			// non blocking send;
			// of client's buff is full, drop the msg
			// sse clients will catch latest price on next tick
			select {
			case ch <- update:
			default:
			}
		}
	}
}
