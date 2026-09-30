//go:build wails

// Package main 是 Wails 桌面壳（M5）：托盘图标 + 窗口加载同一套 Web UI + 一键系统代理。
//
// 独立 go module，避免把 Wails 依赖带进核心模块。启用步骤见 desktop/README.md。
package main

import (
	"context"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend
var assets embed.FS

type App struct {
	ctx context.Context
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// TODO: 在进程内启动 Core（复用 cmd/charstle 的组装逻辑，抽成 internal/app.Run）
}

func (a *App) shutdown(ctx context.Context) {
	// TODO: 恢复系统代理、关闭 Core
}

func main() {
	app := &App{}
	err := wails.Run(&options.App{
		Title:            "Charstle",
		Width:            1440,
		Height:           900,
		MinWidth:         1024,
		MinHeight:        640,
		AssetServer:      &assetserver.Options{Assets: assets},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		BackgroundColour: &options.RGBA{R: 14, G: 16, B: 20, A: 1},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
