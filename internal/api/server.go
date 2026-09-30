// Package api 提供管理界面（Web UI 静态文件）与 REST / WebSocket 接口。
// 路由与前端 web/src/api/client.ts 一一对应。
package api

import (
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"time"

	"charstle/internal/config"
	"charstle/internal/events"
	"charstle/internal/mitm"
	"charstle/internal/pipeline"
	"charstle/internal/rules"
	"charstle/internal/store"
	"charstle/web"
)

type Deps struct {
	Config   *config.Config
	Store    *store.Store
	Bus      *events.Bus
	Rules    *rules.Engine
	Values   *rules.ValueStore
	CA       *mitm.CA
	Pins     *mitm.PinTracker
	Pipeline *pipeline.Pipeline
	Log      *slog.Logger
}

type Server struct {
	d   Deps
	mux *http.ServeMux
}

func NewServer(d Deps) *Server {
	s := &Server{d: d, mux: http.NewServeMux()}
	s.routes()
	s.mux.Handle("/", spaHandler())
	return s
}

func (s *Server) ListenAndServe(ctx context.Context) error {
	srv := &http.Server{
		Addr:              s.d.Config.AdminAddr(),
		Handler:           s.withAuth(s.mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
	}()
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// withAuth：开启局域网访问且设置了密码时，校验 Basic Auth / 会话 cookie。
func (s *Server) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO
		next.ServeHTTP(w, r)
	})
}

// spaHandler 提供打包进二进制的前端（web/dist），未知路径回退到 index.html。
func spaHandler() http.Handler {
	dist, err := fs.Sub(web.Dist, "dist")
	if err != nil {
		panic(err)
	}
	return http.FileServerFS(dist) // 前端使用 HashRouter，无需 history fallback
}

// ---- 响应工具 ----

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func notImplemented(w http.ResponseWriter, r *http.Request) {
	writeErr(w, http.StatusNotImplemented, errors.New(r.Method+" "+r.URL.Path+": not implemented"))
}
