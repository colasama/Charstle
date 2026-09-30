package pipeline

import (
	"io"
	"sync"
)

// Profile 对应前端 ThrottleProfile。
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
	Hosts   []string `json:"hosts"` // 空 = 全部
}

// Throttler 全局网络限速（规则里的 throttle:// 对单个请求覆盖）。
type Throttler struct {
	mu  sync.RWMutex
	cfg ThrottleConfig
}

func NewThrottler() *Throttler { return &Throttler{} }

func (t *Throttler) Config() ThrottleConfig {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.cfg
}

func (t *Throttler) SetConfig(c ThrottleConfig) {
	t.mu.Lock()
	t.cfg = c
	t.mu.Unlock()
}

// WrapReader 返回按 bytesPerSec 限速的 reader（令牌桶）。bytesPerSec<=0 时原样返回。
func WrapReader(r io.Reader, bytesPerSec int64) io.Reader {
	if bytesPerSec <= 0 {
		return r
	}
	// TODO: 令牌桶
	return r
}
