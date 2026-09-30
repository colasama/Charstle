package api

import (
	"charstle/internal/config"
	"charstle/internal/events"
	"charstle/internal/mitm"
	"charstle/internal/pipeline"
	"charstle/internal/proxy"
	"charstle/internal/rules"
	"charstle/internal/store"
	"charstle/internal/sysproxy"
	"charstle/web"
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
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
	Access   *proxy.AccessControl
	Proxy    *proxy.Server
	Log      *slog.Logger
}
type Server struct {
	d        Deps
	mux      *http.ServeMux
	mu       sync.Mutex
	previous *sysproxy.Settings
}

func NewServer(d Deps) *Server {
	s := &Server{d: d, mux: http.NewServeMux()}
	s.routes()
	s.mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) { writeErr(w, 404, errors.New("API route not found")) })
	s.mux.Handle("/", spaHandler())
	return s
}
func (s *Server) Handler() http.Handler { return s.withAuth(s.mux) }
func (s *Server) ListenAndServe(ctx context.Context) error {
	ln, err := net.Listen("tcp", s.d.Config.AdminAddr())
	if err != nil {
		return err
	}
	return s.Serve(ctx, ln)
}
func (s *Server) Serve(ctx context.Context, ln net.Listener) error {
	srv := &http.Server{Handler: s.Handler(), ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 90 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }}
	go func() { <-ctx.Done(); srv.Close() }()
	err := srv.Serve(ln)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}
func (s *Server) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.previous != nil {
		err := sysproxy.Restore(*s.previous)
		if err != nil {
			return err
		}
		s.previous = nil
	}
	return nil
}

func (s *Server) SystemProxyEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.previous != nil
}
func (s *Server) SetSystemProxy(on bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if on && s.previous == nil {
		prev, err := sysproxy.Enable("127.0.0.1", s.d.Config.ProxyPort, s.d.Config.SystemProxyBypass)
		if err != nil {
			return err
		}
		s.previous = &prev
	}
	if !on && s.previous != nil {
		if err := sysproxy.Restore(*s.previous); err != nil {
			return err
		}
		s.previous = nil
	}
	s.d.Bus.Publish(events.Event{Type: "resync"})
	return nil
}
func (s *Server) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "frame-ancestors 'self' wails://wails.localhost http://wails.localhost https://wails.localhost")
		host := r.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		allowed := host == "localhost" || net.ParseIP(host).IsLoopback()
		if s.d.Config.AdminLanAccess {
			for _, a := range proxy.LANAddresses() {
				allowed = allowed || host == a.IP
			}
		}
		if !allowed {
			writeErr(w, 403, errors.New("invalid administration host"))
			return
		}
		if origin := r.Header.Get("Origin"); origin != "" {
			u, err := url.Parse(origin)
			if err != nil || !strings.EqualFold(u.Host, r.Host) {
				writeErr(w, 403, errors.New("cross-origin administration is not allowed"))
				return
			}
		}
		if r.Header.Get("Sec-Fetch-Site") == "cross-site" && strings.HasPrefix(r.URL.Path, "/api/") {
			writeErr(w, 403, errors.New("cross-site administration is not allowed"))
			return
		}
		password := s.d.Config.AdminPassword
		if password != "" {
			_, p, ok := r.BasicAuth()
			if !ok || subtle.ConstantTimeCompare([]byte(p), []byte(password)) != 1 {
				w.Header().Set("WWW-Authenticate", `Basic realm="Charstle"`)
				writeErr(w, 401, errors.New("administration password required"))
				return
			}
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Cache-Control", "no-store")
			r.Body = http.MaxBytesReader(w, r.Body, 32<<20)
			if r.Method != "GET" && r.Method != "HEAD" && r.Method != "DELETE" && !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
				writeErr(w, 415, errors.New("Content-Type must be application/json"))
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
func spaHandler() http.Handler {
	dist, err := fs.Sub(web.Dist, "dist")
	if err != nil {
		panic(err)
	}
	return http.FileServerFS(dist)
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
func writeErr(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
func decode(r *http.Request, v any) error {
	d := json.NewDecoder(r.Body)
	if err := d.Decode(v); err != nil {
		return err
	}
	var extra any
	if err := d.Decode(&extra); err != io.EOF {
		return errors.New("expected a single JSON value")
	}
	return nil
}
