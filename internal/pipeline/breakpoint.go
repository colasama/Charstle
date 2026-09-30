package pipeline

import (
	"errors"
	"net/http"
	"sync"
	"time"

	"charstle/internal/events"
	"charstle/internal/flow"
)

type BreakpointRule struct {
	ID       string `json:"id"`
	Enabled  bool   `json:"enabled"`
	Pattern  string `json:"pattern"`
	Method   string `json:"method"` // * = 全部
	Request  bool   `json:"request"`
	Response bool   `json:"response"`
	HitCount int    `json:"hitCount"`
}

// Resolution 是 UI 对被拦截请求的处理结果。
type Resolution struct {
	Action string      `json:"action"` // continue | execute | abort
	Method string      `json:"method,omitempty"`
	URL    string      `json:"url,omitempty"`
	Status int         `json:"status,omitempty"`
	Header http.Header `json:"headers,omitempty"`
	Body   *string     `json:"body,omitempty"`
}

type paused struct {
	id    string
	ctx   *flow.Context
	phase flow.Phase
	done  chan Resolution
}

// Breakpoints 管理断点规则与当前被拦截的请求。
type Breakpoints struct {
	bus     *events.Bus
	Timeout time.Duration

	mu      sync.Mutex
	enabled bool
	rules   []BreakpointRule
	waiting map[string]*paused
}

func NewBreakpoints(bus *events.Bus) *Breakpoints {
	return &Breakpoints{bus: bus, Timeout: 5 * time.Minute, enabled: true, waiting: make(map[string]*paused)}
}

func (b *Breakpoints) SetEnabled(on bool) {
	b.mu.Lock()
	b.enabled = on
	b.mu.Unlock()
}

func (b *Breakpoints) Rules() []BreakpointRule {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]BreakpointRule(nil), b.rules...)
}

func (b *Breakpoints) SetRules(rs []BreakpointRule) {
	b.mu.Lock()
	b.rules = rs
	b.mu.Unlock()
}

// Pause 若 ctx 命中断点规则，则阻塞直到 UI 调用 Resolve、超时或客户端断开。
func (b *Breakpoints) Pause(ctx *flow.Context, phase flow.Phase) error {
	// TODO:
	//   匹配规则 → 生成 paused，写入 waiting，Session.State = paused
	//   bus.Publish(BreakpointPaused, …)
	//   select { case res := <-p.done: 应用修改；case <-time.After(b.Timeout)：放行；case <-ctx.Req.Context().Done() }
	//   bus.Publish(BreakpointResolved, id)
	return nil
}

// Resolve 由 Admin API 调用。
func (b *Breakpoints) Resolve(id string, res Resolution) error {
	b.mu.Lock()
	p, ok := b.waiting[id]
	if ok {
		delete(b.waiting, id)
	}
	b.mu.Unlock()
	if !ok {
		return errors.New("breakpoint not found: " + id)
	}
	p.done <- res
	return nil
}
