package pipeline

import (
	"charstle/internal/events"
	"charstle/internal/flow"
	"charstle/internal/rules"
	"charstle/internal/store"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type BreakpointRule struct {
	ID       string `json:"id"`
	Enabled  bool   `json:"enabled"`
	Pattern  string `json:"pattern"`
	Method   string `json:"method"`
	Request  bool   `json:"request"`
	Response bool   `json:"response"`
	HitCount int    `json:"hitCount"`
}
type Resolution struct {
	Action string      `json:"action"`
	Method string      `json:"method,omitempty"`
	URL    string      `json:"url,omitempty"`
	Status int         `json:"status,omitempty"`
	Header http.Header `json:"headers,omitempty"`
	Body   *string     `json:"body,omitempty"`
}
type PausedItem struct {
	ID        string      `json:"id"`
	SessionID uint64      `json:"sessionId"`
	Phase     string      `json:"phase"`
	Method    string      `json:"method"`
	URL       string      `json:"url"`
	ClientIP  string      `json:"clientIp"`
	PausedAt  int64       `json:"pausedAt"`
	Status    int         `json:"status,omitempty"`
	Header    http.Header `json:"headers"`
	Body      string      `json:"body"`
	Truncated bool        `json:"truncated,omitempty"`
}
type paused struct {
	item PausedItem
	done chan Resolution
}
type Breakpoints struct {
	bus     *events.Bus
	Timeout time.Duration
	mu      sync.Mutex
	enabled bool
	rules   []BreakpointRule
	waiting map[string]*paused
	update  func(*store.Session)
}

func NewBreakpoints(bus *events.Bus) *Breakpoints {
	return &Breakpoints{bus: bus, Timeout: 5 * time.Minute, enabled: true, rules: []BreakpointRule{}, waiting: map[string]*paused{}}
}
func (b *Breakpoints) SetEnabled(on bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.enabled = on
	if !on {
		for id, p := range b.waiting {
			p.done <- Resolution{Action: "continue"}
			delete(b.waiting, id)
		}
	}
}
func (b *Breakpoints) Enabled() bool { b.mu.Lock(); defer b.mu.Unlock(); return b.enabled }
func (b *Breakpoints) Rules() []BreakpointRule {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]BreakpointRule{}, b.rules...)
}
func (b *Breakpoints) SetRules(rs []BreakpointRule) { b.mu.Lock(); defer b.mu.Unlock(); b.rules = rs }
func (b *Breakpoints) Waiting() []PausedItem {
	b.mu.Lock()
	defer b.mu.Unlock()
	items := []PausedItem{}
	for _, p := range b.waiting {
		items = append(items, p.item)
	}
	return items
}
func (b *Breakpoints) Pause(c *flow.Context, phase flow.Phase) error {
	b.mu.Lock()
	matched := false
	if b.enabled {
		for i, r := range b.rules {
			if r.Enabled && (r.Method == "*" || r.Method == "" || r.Method == c.Req.Method) && ((phase == flow.PhaseRequest && r.Request) || (phase == flow.PhaseResponse && r.Response)) && rules.Matches(r.Pattern, c.Target) {
				matched = true
				b.rules[i].HitCount++
				break
			}
		}
	}
	b.mu.Unlock()
	if !matched {
		return nil
	}
	item := PausedItem{ID: fmt.Sprintf("%d-%s", c.Session.ID, phase.String()), SessionID: c.Session.ID, Phase: phase.String(), Method: c.Req.Method, URL: c.Target.String(), ClientIP: c.ClientIP, PausedAt: time.Now().UnixMilli(), Header: c.Req.Header.Clone()}
	body := c.Req.Body
	if phase == flow.PhaseResponse {
		body = c.Resp.Body
		item.Header = c.Resp.Header.Clone()
		item.Status = c.Resp.StatusCode
	}
	if body != nil {
		data, err := io.ReadAll(io.LimitReader(body, 1<<20+1))
		if err != nil {
			return err
		}
		item.Truncated = len(data) > 1<<20
		item.Body = string(data[:min(len(data), 1<<20)])
		restored := readCloser{io.MultiReader(strings.NewReader(string(data)), body), body}
		if phase == flow.PhaseRequest {
			c.Req.Body = restored
		} else {
			c.Resp.Body = restored
		}
	}
	p := &paused{item: item, done: make(chan Resolution, 1)}
	b.mu.Lock()
	if !b.enabled {
		b.mu.Unlock()
		return nil
	}
	b.waiting[item.ID] = p
	b.mu.Unlock()
	c.Session.State = store.StatePaused
	if b.update != nil {
		b.update(c.Session)
	}
	b.bus.Publish(events.Event{Type: events.BreakpointPaused, Payload: item})
	defer func() {
		b.mu.Lock()
		delete(b.waiting, item.ID)
		b.mu.Unlock()
		c.Session.State = store.StatePending
		b.bus.Publish(events.Event{Type: events.BreakpointResolved, Payload: item.ID})
		if b.update != nil {
			b.update(c.Session)
		}
	}()
	timer := time.NewTimer(b.Timeout)
	defer timer.Stop()
	var res Resolution
	select {
	case res = <-p.done:
	case <-timer.C:
		return nil
	case <-c.Req.Context().Done():
		return c.Req.Context().Err()
	}
	if res.Action == "abort" {
		c.Abort = true
		return errors.New("aborted at breakpoint")
	}
	if res.Action == "continue" {
		return nil
	}
	if phase == flow.PhaseRequest {
		if res.Method != "" {
			c.Req.Method = res.Method
		}
		if res.URL != "" {
			u, _ := url.Parse(res.URL)
			c.Target = u
			c.Req.Host = u.Host
		}
		if res.Header != nil {
			c.Req.Header = res.Header.Clone()
		}
		if res.Body != nil {
			c.Req.Body.Close()
			c.Req.Body = io.NopCloser(strings.NewReader(*res.Body))
			c.Req.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(strings.NewReader(*res.Body)), nil }
			c.Req.ContentLength = int64(len(*res.Body))
			c.Req.Header.Del("Content-Length")
			c.Req.Header.Del("Content-Encoding")
		}
	} else {
		if res.Status != 0 {
			c.Resp.StatusCode = res.Status
		}
		if res.Header != nil {
			c.Resp.Header = res.Header.Clone()
		}
		if res.Body != nil {
			c.Resp.Body.Close()
			c.Resp.Body = io.NopCloser(strings.NewReader(*res.Body))
			c.Resp.ContentLength = int64(len(*res.Body))
			c.Resp.Header.Del("Content-Length")
			c.Resp.Header.Del("Content-Encoding")
		}
	}
	return nil
}
func (b *Breakpoints) Resolve(id string, res Resolution) error {
	if res.Action != "continue" && res.Action != "execute" && res.Action != "abort" {
		return errors.New("invalid action")
	}
	if res.Status != 0 && (res.Status < 200 || res.Status > 599) {
		return errors.New("invalid status")
	}
	if res.URL != "" {
		u, err := url.Parse(res.URL)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return errors.New("invalid URL")
		}
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	p, ok := b.waiting[id]
	if !ok {
		return errors.New("breakpoint not found")
	}
	if p.item.Truncated && res.Body != nil {
		return errors.New("cannot replace truncated body")
	}
	delete(b.waiting, id)
	p.done <- res
	return nil
}
