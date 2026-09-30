// Package events 是进程内的发布订阅总线，Admin API 通过 WebSocket 把事件推给 UI。
// 事件类型与前端 src/api/events.ts 中的 ServerEvent 对应。
package events

import (
	"sync"
	"time"
)

type Type string

const (
	SessionAdd         Type = "session.add"
	SessionUpdate      Type = "session.update"
	SessionClear       Type = "session.clear"
	DevicePending      Type = "device.pending"
	DeviceUpdate       Type = "device.update"
	BreakpointPaused   Type = "breakpoint.paused"
	BreakpointResolved Type = "breakpoint.resolved"
	Stats              Type = "stats"
)

type Event struct {
	Type    Type `json:"type"`
	Payload any  `json:"payload,omitempty"`
}

// FlushInterval 订阅者收到的是按此间隔合并后的批次，避免高流量时 UI 卡顿。
const FlushInterval = 100 * time.Millisecond

type Bus struct {
	mu      sync.RWMutex
	subs    map[int]chan []Event
	next    int
	pending []Event
	timer   *time.Timer
}

func NewBus() *Bus {
	return &Bus{subs: make(map[int]chan []Event)}
}

// Publish 投递一个事件。不能阻塞调用方（代理热路径）。
func (b *Bus) Publish(e Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.subs) == 0 {
		return
	}
	if len(b.pending) >= 10000 {
		b.pending = []Event{{Type: "resync"}}
	}
	b.pending = append(b.pending, e)
	if b.timer == nil {
		b.timer = time.AfterFunc(FlushInterval, b.flush)
	}
}

func (b *Bus) flush() {
	b.mu.Lock()
	defer b.mu.Unlock()
	batch := b.pending
	b.pending = nil
	b.timer = nil
	for _, ch := range b.subs {
		select {
		case ch <- batch:
		default:
			select {
			case <-ch:
			default:
			}
			ch <- []Event{{Type: "resync"}}
		}
	}
}

// Subscribe 返回事件批次通道和取消函数。
func (b *Bus) Subscribe() (<-chan []Event, func()) {
	b.mu.Lock()
	defer b.mu.Unlock()
	id := b.next
	b.next++
	ch := make(chan []Event, 64)
	b.subs[id] = ch
	return ch, func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		if c, ok := b.subs[id]; ok {
			delete(b.subs, id)
			close(c)
		}
	}
}
