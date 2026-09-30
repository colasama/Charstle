// Command charstle 启动代理服务与管理界面。
//
//	charstle -data-dir ~/.charstle
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"charstle/internal/api"
	"charstle/internal/config"
	"charstle/internal/events"
	"charstle/internal/mitm"
	"charstle/internal/pipeline"
	"charstle/internal/proxy"
	"charstle/internal/rules"
	"charstle/internal/store"
)

func main() {
	home, _ := os.UserHomeDir()
	dataDir := flag.String("data-dir", filepath.Join(home, ".charstle"), "数据目录（证书、规则、设置）")
	flag.Parse()

	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))

	cfg, err := config.Load(*dataDir)
	if err != nil {
		log.Error("load config", "err", err)
		os.Exit(1)
	}

	// ---- 组装各模块 ----
	bus := events.NewBus()
	sessions := store.New(cfg.Capture, bus)

	ca, err := mitm.LoadOrCreateCA(filepath.Join(*dataDir, "ca"))
	if err != nil {
		log.Error("load CA", "err", err)
		os.Exit(1)
	}
	certs := mitm.NewLeafCache(ca, 2000)
	pins := mitm.NewPinTracker()

	values := rules.NewValueStore(filepath.Join(*dataDir, "values"))
	engine := rules.NewEngine(values)
	// TODO: 从 dataDir/rules 加载规则组并 engine.Load(groups)

	pipe := pipeline.New(pipeline.Options{
		Rules:       engine,
		Store:       sessions,
		Bus:         bus,
		Upstream:    cfg.Upstream,
		Breakpoints: pipeline.NewBreakpoints(bus),
		Throttle:    pipeline.NewThrottler(),
	})

	proxySrv := proxy.NewServer(proxy.Options{
		Config:  cfg,
		Handler: pipe,
		Access:  proxy.NewAccessControl(cfg.Access, bus),
		Certs:   certs,
		Pins:    pins,
		Store:   sessions,
		Log:     log,
		// 代理端口上的内置页面（charstle.pro / <ip>:<port>/ssl）
		Builtin: api.CertPageHandler(ca, cfg),
	})

	adminSrv := api.NewServer(api.Deps{
		Config:   cfg,
		Store:    sessions,
		Bus:      bus,
		Rules:    engine,
		Values:   values,
		CA:       ca,
		Pins:     pins,
		Pipeline: pipe,
		Log:      log,
	})

	// ---- 运行 ----
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errc := make(chan error, 2)
	go func() { errc <- proxySrv.ListenAndServe(ctx) }()
	go func() { errc <- adminSrv.ListenAndServe(ctx) }()

	log.Info("charstle started",
		"proxy", cfg.ProxyAddr(),
		"admin", cfg.AdminAddr(),
		"lan", proxy.LANAddresses(),
	)

	select {
	case <-ctx.Done():
		log.Info("shutting down")
	case err := <-errc:
		if err != nil {
			log.Error("server exited", "err", err)
		}
	}
	// TODO: 若开启了系统代理，退出前恢复（sysproxy.Disable）
}
