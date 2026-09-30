package store

import (
	"sync"
	"sync/atomic"

	"charstle/internal/config"
	"charstle/internal/events"
)

// Store 是会话的环形缓冲：超过 MaxSessions 或 MaxMemoryMB 时淘汰最旧的。
type Store struct {
	cfg config.Capture
	bus *events.Bus

	nextID    atomic.Uint64
	recording atomic.Bool

	mu    sync.RWMutex
	items []*Session          // 按 ID 递增
	byID  map[uint64]*Session // 快速查找
}

func New(cfg config.Capture, bus *events.Bus) *Store {
	s := &Store{cfg: cfg, bus: bus, byID: make(map[uint64]*Session)}
	s.recording.Store(true)
	return s
}

func (s *Store) Recording() bool      { return s.recording.Load() }
func (s *Store) SetRecording(on bool) { s.recording.Store(on) }

// NewSession 分配 ID。录制暂停时仍然返回会话（规则照常生效），只是不入库。
func (s *Store) NewSession() *Session {
	return &Session{ID: s.nextID.Add(1), State: StatePending}
}

// Add 入库并推送 session.add。
func (s *Store) Add(sess *Session) {
	if !s.Recording() {
		return
	}
	s.mu.Lock()
	s.items = append(s.items, sess)
	s.byID[sess.ID] = sess
	// TODO: 超出上限时淘汰最旧会话并清理其落盘文件
	s.mu.Unlock()
	s.bus.Publish(events.Event{Type: events.SessionAdd, Payload: sess.Summary()})
}

// Update 在会话状态变化后调用（收到响应头 / 完成 / 出错 / 命中断点）。
func (s *Store) Update(sess *Session) {
	s.bus.Publish(events.Event{Type: events.SessionUpdate, Payload: sess.Summary()})
}

func (s *Store) Get(id uint64) (*Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess, ok := s.byID[id]
	return sess, ok
}

// Query 列表查询过滤条件（与前端过滤栏对应）。
type Query struct {
	Keyword  string
	ClientIP string
	Offset   int
	Limit    int
}

func (s *Store) List(q Query) []Summary {
	// TODO: 过滤与分页
	return nil
}

func (s *Store) Clear() {
	s.mu.Lock()
	s.items = nil
	s.byID = make(map[uint64]*Session)
	s.mu.Unlock()
	s.bus.Publish(events.Event{Type: events.SessionClear})
}
