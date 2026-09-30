package rules

import (
	"errors"
	"sync"
)

type ValueType string

const (
	ValueJSON    ValueType = "json"
	ValueText    ValueType = "text"
	ValueHeaders ValueType = "headers"
	ValueHTML    ValueType = "html"
)

type Value struct {
	Key     string    `json:"key"`
	Type    ValueType `json:"type"`
	Content string    `json:"content"`
}

// ValueStore 保存可在规则中通过 {key} 引用的数据片段，以及 Mock 脚本（type=js 的文件）。
type ValueStore struct {
	dir string
	mu  sync.RWMutex
	m   map[string]Value
}

func NewValueStore(dir string) *ValueStore {
	// TODO: 从 dir 加载
	return &ValueStore{dir: dir, m: make(map[string]Value)}
}

func (s *ValueStore) Get(key string) (Value, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.m[key]
	return v, ok
}

func (s *ValueStore) List() []Value {
	// TODO
	return nil
}

func (s *ValueStore) Put(v Value) error {
	// TODO: 写盘
	return errors.New("ValueStore.Put: not implemented")
}

func (s *ValueStore) Delete(key string) error {
	// TODO
	return errors.New("ValueStore.Delete: not implemented")
}

// Resolve 把 "{key}" 解析为 Value 内容；非引用形式原样返回。
func (s *ValueStore) Resolve(ref string) (string, error) {
	if len(ref) >= 2 && ref[0] == '{' && ref[len(ref)-1] == '}' {
		v, ok := s.Get(ref[1 : len(ref)-1])
		if !ok {
			return "", errors.New("value not found: " + ref)
		}
		return v.Content, nil
	}
	return ref, nil
}
