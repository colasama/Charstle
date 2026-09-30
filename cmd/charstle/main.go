package main

import (
	"charstle/internal/app"
	"charstle/internal/config"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
)

var version = "0.1.0-dev"

func main() {
	home, err := os.UserHomeDir()
	if err != nil {
		log.Fatal(err)
	}
	data := flag.String("data-dir", filepath.Join(home, ".charstle"), "Data directory")
	proxyPort := flag.Int("proxy-port", 0, "Override proxy port (default 8888)")
	adminPort := flag.Int("admin-port", 0, "Override administration port (default 8899)")
	noOpen := flag.Bool("no-open", false, "Do not open a browser")
	showVersion := flag.Bool("version", false, "Print version")
	flag.Parse()
	if *showVersion {
		fmt.Println("Charstle " + version)
		return
	}
	cfg, err := config.Load(*data)
	if err != nil {
		log.Fatal(err)
	}
	if *proxyPort != 0 {
		cfg.ProxyPort = *proxyPort
	}
	if *adminPort != 0 {
		cfg.AdminPort = *adminPort
	}
	core, err := app.New(cfg)
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	err = core.Run(ctx, func() {
		url := fmt.Sprintf("http://127.0.0.1:%d", cfg.AdminPort)
		fmt.Printf("Charstle %s\nAdmin: %s\nProxy: %s\nData: %s\n", version, url, cfg.ProxyAddr(), cfg.DataDir)
		if !*noOpen {
			openBrowser(url)
		}
	})
	closeErr := core.Close()
	if err != nil {
		log.Print(err)
	}
	if closeErr != nil {
		log.Printf("restore system proxy: %v", closeErr)
	}
	if err != nil || closeErr != nil {
		os.Exit(1)
	}
}
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err == nil {
		go cmd.Wait()
	}
}
