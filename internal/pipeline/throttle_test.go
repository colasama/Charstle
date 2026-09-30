package pipeline

import (
	"context"
	"io"
	"strings"
	"testing"
	"time"
)

func TestPacingAndCancellation(t *testing.T) {
	start := time.Now()
	b, err := io.ReadAll(pace(context.Background(), strings.NewReader(strings.Repeat("x", 100)), 1000))
	if err != nil || len(b) != 100 || time.Since(start) < 90*time.Millisecond {
		t.Fatalf("pace: %d %v %v", len(b), err, time.Since(start))
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	start = time.Now()
	_, err = io.ReadAll(pace(ctx, strings.NewReader("x"), 1))
	if err != context.Canceled || time.Since(start) > time.Second {
		t.Fatalf("cancel: %v", err)
	}
}
