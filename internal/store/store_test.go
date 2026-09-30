package store

import (
	"bytes"
	"charstle/internal/config"
	"charstle/internal/events"
	"io"
	"testing"
)

func TestCaptureAndEviction(t *testing.T) {
	c := NewCapture(io.NopCloser(bytes.NewReader([]byte("abcdef"))), 3)
	out, err := io.ReadAll(c)
	if err != nil || string(out) != "abcdef" {
		t.Fatal(err, string(out))
	}
	c.Close()
	ref := c.Snapshot()
	if ref.Size != 6 || !ref.Truncated {
		t.Fatal(ref)
	}
	r, _ := ref.Open()
	b, _ := io.ReadAll(r)
	r.Close()
	if string(b) != "abc" {
		t.Fatal(string(b))
	}
	s := New(config.Capture{MaxSessions: 1, MaxMemoryMB: 1}, events.NewBus())
	a := s.NewSession()
	a.Host = "before"
	s.Add(a)
	a.Host = "after"
	snapshot, _ := s.Get(a.ID)
	if snapshot.Host != "before" {
		t.Fatal("mutable store snapshot")
	}
	s.Add(s.NewSession())
	if _, ok := s.Get(a.ID); ok {
		t.Fatal("eviction failed")
	}
	s.SetRecording(false)
	v := s.NewSession()
	s.Add(v)
	s.Update(v)
	if _, ok := s.Get(v.ID); ok {
		t.Fatal("recording disabled")
	}
}
