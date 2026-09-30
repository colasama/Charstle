package pipeline

import (
	"context"
	"io"
	"sync"
	"time"
)

type Profile struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	DownKbps  int     `json:"down"`
	UpKbps    int     `json:"up"`
	LatencyMs int     `json:"latency"`
	LossPct   float64 `json:"loss"`
}
type ThrottleConfig struct {
	Enabled bool     `json:"enabled"`
	Profile Profile  `json:"profile"`
	Hosts   []string `json:"hosts"`
}
type Throttler struct {
	mu  sync.RWMutex
	cfg ThrottleConfig
}

func NewThrottler() *Throttler {
	return &Throttler{cfg: ThrottleConfig{Hosts: []string{}, Profile: Profile{ID: "custom", Name: "Custom"}}}
}
func (t *Throttler) Config() ThrottleConfig     { t.mu.RLock(); defer t.mu.RUnlock(); return t.cfg }
func (t *Throttler) SetConfig(c ThrottleConfig) { t.mu.Lock(); defer t.mu.Unlock(); t.cfg = c }

type pacedReader struct {
	r    io.Reader
	ctx  context.Context
	rate int64
	next time.Time
}

func (r *pacedReader) Read(p []byte) (int, error) {
	p = p[:min(len(p), max(1, int(r.rate/10)))]
	n, err := r.r.Read(p)
	if n > 0 {
		now := time.Now()
		if r.next.Before(now) {
			r.next = now
		}
		r.next = r.next.Add(time.Duration(float64(n) / float64(r.rate) * float64(time.Second)))
		if e := wait(r.ctx, time.Until(r.next)); e != nil {
			return n, e
		}
	}
	return n, err
}
func WrapReader(r io.Reader, rate int64) io.Reader { return pace(context.Background(), r, rate) }
func pace(ctx context.Context, r io.Reader, rate int64) io.Reader {
	if rate <= 0 {
		return r
	}
	return &pacedReader{r: r, ctx: ctx, rate: rate}
}
func wait(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-t.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
