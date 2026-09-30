package app

import (
	"charstle/internal/api"
	"charstle/internal/config"
	"charstle/internal/events"
	"charstle/internal/mitm"
	"charstle/internal/pipeline"
	"charstle/internal/proxy"
	"charstle/internal/rules"
	"charstle/internal/store"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"time"
)

type Core struct {
	Config   *config.Config
	Admin    *api.Server
	Proxy    *proxy.Server
	Pipeline *pipeline.Pipeline
	Store    *store.Store
}

func New(cfg *config.Config) (*Core, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	if cfg.Capture.SpillDir == "" {
		cfg.Capture.SpillDir = filepath.Join(cfg.DataDir, "bodies")
	}
	bus := events.NewBus()
	sessions := store.New(cfg.Capture, bus)
	ca, err := mitm.LoadOrCreateCA(filepath.Join(cfg.DataDir, "ca"))
	if err != nil {
		return nil, err
	}
	values := rules.NewValueStore(filepath.Join(cfg.DataDir, "values"))
	if values.LoadError != nil {
		return nil, values.LoadError
	}
	engine := rules.NewEngine(values)
	groups := []rules.Group{}
	if err = load(filepath.Join(cfg.DataDir, "rules.json"), &groups); err != nil {
		return nil, err
	}
	engine.Load(groups)
	breakpoints := pipeline.NewBreakpoints(bus)
	breakpoints.Timeout = time.Duration(cfg.Capture.BreakpointTimeoutS) * time.Second
	var brules []pipeline.BreakpointRule
	if err = load(filepath.Join(cfg.DataDir, "breakpoints.json"), &brules); err != nil {
		return nil, err
	}
	breakpoints.SetRules(brules)
	throttle := pipeline.NewThrottler()
	tc := throttle.Config()
	if err = load(filepath.Join(cfg.DataDir, "throttle.json"), &tc); err != nil {
		return nil, err
	}
	throttle.SetConfig(tc)
	pipe := pipeline.New(pipeline.Options{Protocol: cfg.Protocol, Rules: engine, Store: sessions, Bus: bus, Upstream: cfg.Upstream, Breakpoints: breakpoints, Throttle: throttle})
	access := proxy.NewAccessControl(cfg.Access, bus)
	names := map[string]string{}
	if err = load(filepath.Join(cfg.DataDir, "devices.json"), &names); err != nil {
		return nil, err
	}
	access.SetNames(names)
	pins := mitm.NewPinTracker()
	ps := proxy.NewServer(proxy.Options{Config: cfg, Handler: pipe, Access: access, Certs: mitm.NewLeafCache(ca, 2000), Pins: pins, Store: sessions, Log: slog.Default(), Builtin: api.CertPageHandler(ca, cfg)})
	admin := api.NewServer(api.Deps{Config: cfg, Store: sessions, Bus: bus, Rules: engine, Values: values, CA: ca, Pins: pins, Pipeline: pipe, Access: access, Proxy: ps, Log: slog.Default()})
	return &Core{Config: cfg, Admin: admin, Proxy: ps, Pipeline: pipe, Store: sessions}, nil
}
func load(path string, v any) error {
	b, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if err = json.Unmarshal(b, v); err != nil {
		return fmt.Errorf("%s: %w", path, err)
	}
	return nil
}
func (c *Core) Run(ctx context.Context, ready func()) error {
	pl, err := net.Listen("tcp", c.Config.ProxyAddr())
	if err != nil {
		return err
	}
	defer pl.Close()
	al, err := net.Listen("tcp", c.Config.AdminAddr())
	if err != nil {
		return err
	}
	defer al.Close()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	done := make(chan error, 2)
	go func() { done <- c.Proxy.Serve(ctx, pl) }()
	go func() { done <- c.Admin.Serve(ctx, al) }()
	if ready != nil {
		ready()
	}
	var first error
	select {
	case <-ctx.Done():
	case first = <-done:
		cancel()
		<-done
		return first
	}
	cancel()
	<-done
	<-done
	return first
}
func (c *Core) Close() error { c.Pipeline.Close(); c.Store.Clear(); return c.Admin.Close() }
