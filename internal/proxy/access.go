package proxy

import (
	"sync"
	"time"

	"charstle/internal/config"
	"charstle/internal/events"
)

type DeviceStatus string

const (
	DeviceAllowed DeviceStatus = "allowed"
	DeviceBlocked DeviceStatus = "blocked"
	DevicePending DeviceStatus = "pending"
)

// Device 对应前端 types/device.ts。
type Device struct {
	IP        string       `json:"ip"`
	Name      string       `json:"name,omitempty"`
	UserAgent string       `json:"userAgent,omitempty"`
	Platform  string       `json:"platform"`
	Status    DeviceStatus `json:"status"`
	FirstSeen time.Time    `json:"firstSeen"`
	LastSeen  time.Time    `json:"lastSeen"`
	Requests  int64        `json:"requests"`
	Bytes     int64        `json:"bytes"`
	IsLocal   bool         `json:"isLocal,omitempty"`
}

// AccessControl 决定哪些局域网设备可以使用代理。
type AccessControl struct {
	cfg config.Access
	bus *events.Bus

	mu      sync.Mutex
	devices map[string]*Device
	waiters map[string][]chan bool // 等待 UI 授权的连接
}

func NewAccessControl(cfg config.Access, bus *events.Bus) *AccessControl {
	return &AccessControl{
		cfg:     cfg,
		bus:     bus,
		devices: make(map[string]*Device),
		waiters: make(map[string][]chan bool),
	}
}

// Allow 在每条新连接上调用。模式为 ask 且是新设备时，会阻塞等待 UI 确认（带超时）。
func (a *AccessControl) Allow(ip string) bool {
	// TODO:
	//   本机地址 → true
	//   黑名单 → false；白名单（CIDR 匹配）→ true
	//   mode == allowAll → true；mode == whitelist → false
	//   mode == ask → 已记住的设备按状态；新设备 → 记为 pending，发布 events.DevicePending，
	//                 等待 Decide() 或 60s 超时（超时拒绝）
	return true
}

// Decide 由 Admin API 调用：允许或拒绝一个待授权设备。remember=true 时写入白/黑名单。
func (a *AccessControl) Decide(ip string, allow, remember bool) {
	// TODO
}

func (a *AccessControl) Devices() []Device {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]Device, 0, len(a.devices))
	for _, d := range a.devices {
		out = append(out, *d)
	}
	return out
}

func (a *AccessControl) Rename(ip, name string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if d, ok := a.devices[ip]; ok {
		d.Name = name
	}
}

// Touch 记录设备活动（请求数、流量、UA → 推断平台）。
func (a *AccessControl) Touch(ip, userAgent string, bytes int64) {
	// TODO
}
