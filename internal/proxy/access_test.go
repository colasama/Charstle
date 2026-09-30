package proxy

import (
	"charstle/internal/config"
	"charstle/internal/events"
	"context"
	"testing"
	"time"
)

func TestAccessPolicies(t *testing.T) {
	a := NewAccessControl(config.Access{Mode: config.AccessAllowAll, Blacklist: []string{"10.0.0.0/8", "127.0.0.1"}}, events.NewBus())
	if a.Allow("10.1.2.3") || !a.Allow("127.0.0.1") {
		t.Fatal("blacklist or loopback policy")
	}
	if !a.Allow("192.168.1.5") {
		t.Fatal("allow all")
	}
	a.SetConfig(config.Access{Mode: config.AccessWhitelist})
	if a.Allow("192.168.1.5") {
		t.Fatal("old device bypassed whitelist")
	}
	a.SetConfig(config.Access{Mode: config.AccessAsk})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan bool, 1)
	go func() { done <- a.AllowContext(ctx, "192.168.1.6") }()
	cancel()
	select {
	case allowed := <-done:
		if allowed {
			t.Fatal("cancel allowed")
		}
	case <-time.After(time.Second):
		t.Fatal("cancel stuck")
	}
	ctx, cancel = context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	go func() { done <- a.AllowContext(ctx, "192.168.1.7") }()
	for len(a.Devices()) < 5 && ctx.Err() == nil {
		time.Sleep(time.Millisecond)
	}
	a.Decide("192.168.1.7", true, true)
	if !<-done || !a.Allow("192.168.1.7") {
		t.Fatal("approval not applied")
	}
}
