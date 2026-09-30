package main

import (
	"charstle/internal/app"
	"charstle/internal/config"
	"context"
	"fmt"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wr "github.com/wailsapp/wails/v2/pkg/runtime"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
)

func main() {
	home, err := os.UserHomeDir()
	if err != nil {
		log.Fatal(err)
	}
	data := os.Getenv("CHARSTLE_DATA_DIR")
	if data == "" {
		data = filepath.Join(home, ".charstle")
	}
	cfg, err := config.Load(data)
	if err != nil {
		log.Fatal(err)
	}
	core, err := app.New(cfg)
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	ready := make(chan struct{})
	done := make(chan error, 1)
	go func() { done <- core.Run(ctx, func() { close(ready) }) }()
	select {
	case <-ready:
	case err := <-done:
		cancel()
		core.Close()
		log.Fatal(err)
	}
	var once sync.Once
	cleanup := func() {
		once.Do(func() {
			cancel()
			<-done
			if err := core.Close(); err != nil {
				log.Print(err)
			}
		})
	}
	defer cleanup()
	var window context.Context
	var endTray func()
	show := func() {
		if window != nil {
			wr.WindowShow(window)
			wr.WindowUnminimise(window)
		}
	}
	toggleRecording := func() { core.Store.SetRecording(!core.Store.Recording()) }
	toggleProxy := func() {
		if err := core.Admin.SetSystemProxy(!core.Admin.SystemProxyEnabled()); err != nil && window != nil {
			wr.MessageDialog(window, wr.MessageDialogOptions{Type: wr.ErrorDialog, Title: "System proxy", Message: err.Error()})
		}
	}
	appMenu := menu.NewMenu()
	file := appMenu.AddSubmenu("Charstle")
	file.AddText("Open window", nil, func(*menu.CallbackData) { show() })
	file.AddText("Toggle recording", nil, func(*menu.CallbackData) { toggleRecording() })
	file.AddText("Toggle system proxy", nil, func(*menu.CallbackData) { toggleProxy() })
	file.AddText("Quit", nil, func(*menu.CallbackData) { wr.Quit(window) })
	// The iframe uses the same loopback HTTP origin as the CLI UI, including its
	// authentication and WebSocket connection. No special desktop API bypass exists.
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, `<!doctype html><html><head><meta charset="utf-8"><title>Charstle</title><style>html,body,iframe{margin:0;border:0;width:100%%;height:100%%;overflow:hidden}</style></head><body><iframe title="Charstle" src="http://127.0.0.1:%d/"></iframe></body></html>`, cfg.AdminPort)
	})
	err = wails.Run(&options.App{Title: "Charstle", Width: 1440, Height: 900, MinWidth: 1024, MinHeight: 640, Menu: appMenu, AssetServer: &assetserver.Options{Handler: handler}, OnStartup: func(ctx context.Context) {
		window = ctx
		endTray = startTray(show, toggleRecording, toggleProxy, func() { wr.Quit(ctx) })
	}, OnShutdown: func(context.Context) {
		if endTray != nil {
			endTray()
		}
		cleanup()
	}, BackgroundColour: options.NewRGB(14, 16, 20)})
	if err != nil {
		log.Print(err)
	}
}
