package rules

import (
	"charstle/internal/config"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

type ValueType string

const (
	ValueJSON    ValueType = "json"
	ValueText    ValueType = "text"
	ValueHeaders ValueType = "headers"
	ValueHTML    ValueType = "html"
)

type Value struct {
	Key       string    `json:"key"`
	Type      ValueType `json:"type"`
	Content   string    `json:"content"`
	UpdatedAt int64     `json:"updatedAt"`
	UsedBy    []string  `json:"usedBy"`
}
type ValueStore struct {
	dir       string
	mu        sync.RWMutex
	m         map[string]Value
	LoadError error
}

func NewValueStore(dir string) *ValueStore {
	s := &ValueStore{dir: dir, m: map[string]Value{}}
	b, err := os.ReadFile(filepath.Join(dir, "values.json"))
	if err == nil {
		err = json.Unmarshal(b, &s.m)
	}
	if !os.IsNotExist(err) {
		s.LoadError = err
	}
	return s
}
func (s *ValueStore) Get(key string) (Value, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.m[key]
	return v, ok
}
func (s *ValueStore) List() []Value {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []Value{}
	for _, v := range s.m {
		v.UsedBy = []string{}
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out
}
func (s *ValueStore) Put(v Value) error {
	if v.Key == "" {
		return errors.New("key is required")
	}
	if v.Type == ValueJSON && !json.Valid([]byte(v.Content)) {
		return errors.New("invalid JSON")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	next := make(map[string]Value, len(s.m)+1)
	for k, x := range s.m {
		next[k] = x
	}
	v.UpdatedAt = time.Now().UnixMilli()
	next[v.Key] = v
	if err := config.WriteJSON(filepath.Join(s.dir, "values.json"), next); err != nil {
		return err
	}
	s.m = next
	return nil
}
func (s *ValueStore) Delete(key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	next := make(map[string]Value, len(s.m))
	for k, v := range s.m {
		if k != key {
			next[k] = v
		}
	}
	if err := config.WriteJSON(filepath.Join(s.dir, "values.json"), next); err != nil {
		return err
	}
	s.m = next
	return nil
}
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
