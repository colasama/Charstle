package store

import (
	"charstle/internal/config"
	"charstle/internal/events"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Stored sessions are immutable snapshots, never the live pipeline object.
type Store struct {
	cfg       config.Capture
	bus       *events.Bus
	nextID    atomic.Uint64
	recording atomic.Bool
	mu        sync.RWMutex
	items     []*Session
	byID      map[uint64]*Session
}

func New(cfg config.Capture, bus *events.Bus) *Store {
	s := &Store{cfg: cfg, bus: bus, byID: make(map[uint64]*Session)}
	s.recording.Store(true)
	return s
}
func (s *Store) Recording() bool { return s.recording.Load() }
func (s *Store) SetRecording(on bool) {
	s.recording.Store(on)
	s.bus.Publish(events.Event{Type: "resync"})
}
func (s *Store) CaptureLimit() int64 { return int64(s.cfg.BodyCaptureLimitKB) * 1024 }
func (s *Store) NewSession() *Session {
	return &Session{ID: s.nextID.Add(1), State: StatePending, Timing: Timing{Start: time.Now()}}
}
func clone(v *Session) *Session {
	c := *v
	c.ReqHeader = v.ReqHeader.Clone()
	c.RespHeader = v.RespHeader.Clone()
	c.Hits = append([]RuleHit{}, v.Hits...)
	c.Frames = append([]WsFrame{}, v.Frames...)
	c.ReqBody.inline = append([]byte(nil), v.ReqBody.inline...)
	c.RespBody.inline = append([]byte(nil), v.RespBody.inline...)
	return &c
}
func (s *Store) Add(v *Session) {
	if !s.Recording() {
		return
	}
	s.mu.Lock()
	c := clone(v)
	s.items = append(s.items, c)
	s.byID[v.ID] = c
	s.evict()
	s.mu.Unlock()
	s.bus.Publish(events.Event{Type: events.SessionAdd, Payload: c.Summary()})
}
func (s *Store) Update(v *Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, ok := s.byID[v.ID]
	if !ok {
		return
	}
	c := clone(v)
	if s.cfg.SpillDir != "" && !v.Timing.End.IsZero() {
		c.ReqBody.spill(s.cfg.SpillDir)
		c.RespBody.spill(s.cfg.SpillDir)
	}
	if old.ReqBody.file != c.ReqBody.file {
		old.ReqBody.remove()
	}
	if old.RespBody.file != c.RespBody.file {
		old.RespBody.remove()
	}
	s.byID[v.ID] = c
	for i, x := range s.items {
		if x.ID == v.ID {
			s.items[i] = c
			break
		}
	}
	s.evict()
	s.bus.Publish(events.Event{Type: events.SessionUpdate, Payload: c.Summary()})
}
func (s *Store) evict() {
	usage := func(v *Session) int64 {
		n := int64(len(v.ReqBody.inline)+len(v.RespBody.inline)) + 2048
		for _, f := range v.Frames {
			n += int64(len(f.Data.inline)) + 128
		}
		return n
	}
	var memory int64
	for _, v := range s.items {
		memory += usage(v)
	}
	for len(s.items) > 0 && ((s.cfg.MaxSessions > 0 && len(s.items) > s.cfg.MaxSessions) || (s.cfg.MaxMemoryMB > 0 && memory > int64(s.cfg.MaxMemoryMB)<<20)) {
		v := s.items[0]
		memory -= usage(v)
		v.ReqBody.remove()
		v.RespBody.remove()
		delete(s.byID, v.ID)
		s.items = s.items[1:]
		s.bus.Publish(events.Event{Type: "session.remove", Payload: v.ID})
	}
}
func (s *Store) Get(id uint64) (*Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.byID[id]
	if !ok {
		return nil, false
	}
	return clone(v), true
}

type Query struct {
	Keyword, ClientIP string
	Offset, Limit     int
}

func (s *Store) List(q Query) []Summary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []Summary{}
	skip := max(q.Offset, 0)
	for i := len(s.items) - 1; i >= 0; i-- {
		v := s.items[i]
		if q.ClientIP != "" && v.ClientIP != q.ClientIP {
			continue
		}
		if !strings.Contains(strings.ToLower(v.URL), strings.ToLower(q.Keyword)) {
			continue
		}
		if skip > 0 {
			skip--
			continue
		}
		out = append(out, v.Summary())
		if q.Limit > 0 && len(out) >= q.Limit {
			break
		}
	}
	return out
}
func (s *Store) Clear() {
	s.mu.Lock()
	for _, v := range s.items {
		v.ReqBody.remove()
		v.RespBody.remove()
	}
	s.items = nil
	s.byID = make(map[uint64]*Session)
	s.mu.Unlock()
	s.bus.Publish(events.Event{Type: events.SessionClear})
}

func (s *Store) Delete(id uint64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if v, ok := s.byID[id]; ok {
		v.ReqBody.remove()
		v.RespBody.remove()
		delete(s.byID, id)
		for i, x := range s.items {
			if x.ID == id {
				s.items = append(s.items[:i], s.items[i+1:]...)
				break
			}
		}
		s.bus.Publish(events.Event{Type: "session.remove", Payload: id})
	}
}
