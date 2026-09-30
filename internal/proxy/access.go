package proxy

import (
	"charstle/internal/config"
	"charstle/internal/events"
	"context"
	"net"
	"sort"
	"strings"
	"sync"
	"time"
)

type DeviceStatus string

const (
	DeviceAllowed DeviceStatus = "allowed"
	DeviceBlocked DeviceStatus = "blocked"
	DevicePending DeviceStatus = "pending"
)

type Device struct {
	IP        string       `json:"ip"`
	Name      string       `json:"name,omitempty"`
	UserAgent string       `json:"userAgent,omitempty"`
	Platform  string       `json:"platform"`
	Status    DeviceStatus `json:"status"`
	FirstSeen int64        `json:"firstSeen"`
	LastSeen  int64        `json:"lastSeen"`
	Requests  int64        `json:"requests"`
	Bytes     int64        `json:"bytes"`
	IsLocal   bool         `json:"isLocal,omitempty"`
}
type AccessControl struct {
	cfg     config.Access
	bus     *events.Bus
	mu      sync.Mutex
	devices map[string]*Device
	waiters map[string][]chan bool
	names   map[string]string
}

func NewAccessControl(cfg config.Access, bus *events.Bus) *AccessControl {
	return &AccessControl{cfg: cfg, bus: bus, devices: map[string]*Device{}, waiters: map[string][]chan bool{}, names: map[string]string{}}
}
func matchesIP(ip string, list []string) bool {
	for _, s := range list {
		if ip == s {
			return true
		}
		_, n, err := net.ParseCIDR(s)
		if err == nil && n.Contains(net.ParseIP(ip)) {
			return true
		}
	}
	return false
}
func (a *AccessControl) Config() config.Access {
	a.mu.Lock()
	defer a.mu.Unlock()
	c := a.cfg
	c.Whitelist = append([]string{}, c.Whitelist...)
	c.Blacklist = append([]string{}, c.Blacklist...)
	return c
}
func (a *AccessControl) SetConfig(c config.Access) { a.mu.Lock(); a.cfg = c; a.mu.Unlock() }
func (a *AccessControl) Allow(ip string) bool      { return a.AllowContext(context.Background(), ip) }
func (a *AccessControl) AllowContext(ctx context.Context, ip string) bool {
	a.mu.Lock()
	now := time.Now().UnixMilli()
	d := a.devices[ip]
	if d == nil {
		d = &Device{IP: ip, Platform: "unknown", FirstSeen: now, LastSeen: now, Status: DevicePending, IsLocal: net.ParseIP(ip).IsLoopback()}
		d.Name = a.names[ip]
		a.devices[ip] = d
	}
	allowed := d.IsLocal || matchesIP(ip, a.cfg.Whitelist) || a.cfg.Mode == config.AccessAllowAll
	denied := matchesIP(ip, a.cfg.Blacklist) || d.Status == DeviceBlocked
	if d.IsLocal {
		denied = false
	}
	if denied {
		d.Status = DeviceBlocked
		a.mu.Unlock()
		return false
	}
	if allowed || (d.Status == DeviceAllowed && a.cfg.Mode != config.AccessWhitelist) {
		d.Status = DeviceAllowed
		a.mu.Unlock()
		return true
	}
	if a.cfg.Mode == config.AccessWhitelist {
		a.mu.Unlock()
		return false
	}
	ch := make(chan bool, 1)
	a.waiters[ip] = append(a.waiters[ip], ch)
	snapshot := *d
	a.mu.Unlock()
	a.bus.Publish(events.Event{Type: events.DevicePending, Payload: snapshot})
	defer func() {
		a.mu.Lock()
		defer a.mu.Unlock()
		ws := a.waiters[ip]
		for i, w := range ws {
			if w == ch {
				a.waiters[ip] = append(ws[:i], ws[i+1:]...)
				break
			}
		}
		if len(a.waiters[ip]) == 0 {
			delete(a.waiters, ip)
		}
	}()
	timer := time.NewTimer(60 * time.Second)
	defer timer.Stop()
	select {
	case ok := <-ch:
		return ok
	case <-timer.C:
		return false
	case <-ctx.Done():
		return false
	}
}
func (a *AccessControl) Decide(ip string, allow, remember bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	d := a.devices[ip]
	if d == nil {
		d = &Device{IP: ip, Platform: "unknown", FirstSeen: time.Now().UnixMilli()}
		a.devices[ip] = d
	}
	d.Status = DeviceBlocked
	if allow {
		d.Status = DeviceAllowed
	}
	if remember {
		clean := func(v []string) []string {
			out := []string{}
			for _, s := range v {
				if s != ip {
					out = append(out, s)
				}
			}
			return out
		}
		a.cfg.Whitelist = clean(a.cfg.Whitelist)
		a.cfg.Blacklist = clean(a.cfg.Blacklist)
		if allow {
			a.cfg.Whitelist = append(a.cfg.Whitelist, ip)
		} else {
			a.cfg.Blacklist = append(a.cfg.Blacklist, ip)
		}
	}
	for _, w := range a.waiters[ip] {
		w <- allow
	}
	delete(a.waiters, ip)
	a.bus.Publish(events.Event{Type: events.DeviceUpdate, Payload: *d})
}
func (a *AccessControl) Devices() []Device {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := []Device{}
	for _, d := range a.devices {
		out = append(out, *d)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].IP < out[j].IP })
	return out
}
func (a *AccessControl) Rename(ip, name string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.names[ip] = name
	if d := a.devices[ip]; d != nil {
		d.Name = name
		a.bus.Publish(events.Event{Type: events.DeviceUpdate, Payload: *d})
	}
}
func (a *AccessControl) SetNames(names map[string]string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	for ip, name := range names {
		a.names[ip] = name
	}
}
func (a *AccessControl) Names() map[string]string {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := map[string]string{}
	for ip, name := range a.names {
		out[ip] = name
	}
	return out
}
func (a *AccessControl) Touch(ip, ua string, bytes int64) {
	a.mu.Lock()
	defer a.mu.Unlock()
	d := a.devices[ip]
	if d == nil {
		return
	}
	d.LastSeen = time.Now().UnixMilli()
	d.Requests++
	d.Bytes += bytes
	d.UserAgent = ua
	ua = strings.ToLower(ua)
	switch {
	case strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad"):
		d.Platform = "ios"
	case strings.Contains(ua, "android"):
		d.Platform = "android"
	case strings.Contains(ua, "windows"):
		d.Platform = "windows"
	case strings.Contains(ua, "mac"):
		d.Platform = "macos"
	case strings.Contains(ua, "linux"):
		d.Platform = "linux"
	}
	a.bus.Publish(events.Event{Type: events.DeviceUpdate, Payload: *d})
}
