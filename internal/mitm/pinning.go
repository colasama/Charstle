package mitm

import (
	"sync"
	"time"
)

// PinnedHost 客户端拒绝了代理证书（证书固定 / 未信任 CA）的域名。
type PinnedHost struct {
	Host     string    `json:"host"`
	Reason   string    `json:"reason"`
	Failures int       `json:"failures"`
	Since    time.Time `json:"since"`
	ClientIP string    `json:"clientIp"`
}

// PinTracker 记录握手失败的域名；超过阈值后该域名自动降级为隧道透传，避免 App 一直报错。
type PinTracker struct {
	Threshold int

	mu    sync.Mutex
	hosts map[string]*PinnedHost
}

func NewPinTracker() *PinTracker {
	return &PinTracker{Threshold: 2, hosts: make(map[string]*PinnedHost)}
}

// RecordFailure 在客户端 TLS 握手失败（bad_certificate / unknown_ca / 握手中断开）时调用。
func (p *PinTracker) RecordFailure(host, reason, clientIP string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	h, ok := p.hosts[host]
	if !ok {
		h = &PinnedHost{Host: host, Since: time.Now(), ClientIP: clientIP}
		p.hosts[host] = h
	}
	h.Failures++
	h.Reason = reason
}

// ShouldBypass 返回该域名是否应直接走隧道。
func (p *PinTracker) ShouldBypass(host string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	h, ok := p.hosts[host]
	return ok && h.Failures >= p.Threshold
}

func (p *PinTracker) List() []PinnedHost {
	p.mu.Lock()
	defer p.mu.Unlock()
	out := make([]PinnedHost, 0, len(p.hosts))
	for _, h := range p.hosts {
		out = append(out, *h)
	}
	return out
}

// Clear 清除指定域名；不传则全部清除。
func (p *PinTracker) Clear(hosts ...string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if len(hosts) == 0 {
		p.hosts = make(map[string]*PinnedHost)
		return
	}
	for _, h := range hosts {
		delete(p.hosts, h)
	}
}
