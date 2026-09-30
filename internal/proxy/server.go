package proxy

import (
	"charstle/internal/config"
	"charstle/internal/flow"
	"charstle/internal/mitm"
	"charstle/internal/store"
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Handler interface {
	HandleRequest(http.ResponseWriter, *http.Request, flow.ConnInfo)
}
type Options struct {
	Config  *config.Config
	Handler Handler
	Access  *AccessControl
	Certs   *mitm.LeafCache
	Pins    *mitm.PinTracker
	Store   *store.Store
	Log     *slog.Logger
	Builtin http.Handler
}
type Server struct {
	opt   Options
	ssl   atomic.Pointer[config.SSL]
	mu    sync.Mutex
	conns map[net.Conn]bool
}

func NewServer(opt Options) *Server {
	s := &Server{opt: opt, conns: map[net.Conn]bool{}}
	s.SetSSL(opt.Config.SSL)
	return s
}
func (s *Server) SetSSL(cfg config.SSL) { s.ssl.Store(&cfg) }
func (s *Server) SSL() config.SSL {
	c := *s.ssl.Load()
	c.Include = append([]string{}, c.Include...)
	c.Exclude = append([]string{}, c.Exclude...)
	return c
}
func (s *Server) ListenAndServe(ctx context.Context) error {
	ln, err := net.Listen("tcp", s.opt.Config.ProxyAddr())
	if err != nil {
		return err
	}
	return s.Serve(ctx, ln)
}
func (s *Server) Serve(ctx context.Context, ln net.Listener) error {
	server := &http.Server{Handler: s, ReadHeaderTimeout: 15 * time.Second, IdleTimeout: 90 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }}
	go func() {
		<-ctx.Done()
		server.Close()
		s.mu.Lock()
		for conn := range s.conns {
			conn.Close()
		}
		s.mu.Unlock()
	}()
	err := server.Serve(ln)
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if !s.opt.Access.AllowContext(r.Context(), ip) {
		http.Error(w, "device access denied", 403)
		return
	}
	s.opt.Access.Touch(ip, r.UserAgent(), 0)
	if r.Method == "CONNECT" {
		s.handleConnect(w, r, ip)
		return
	}
	if s.isSelf(r) {
		s.opt.Builtin.ServeHTTP(w, r)
		return
	}
	s.opt.Handler.HandleRequest(w, r, flow.ConnInfo{ClientIP: ip, Scheme: "http"})
}
func (s *Server) isSelf(r *http.Request) bool {
	host := r.Host
	if host == "" {
		host = r.URL.Host
	}
	h, port, err := net.SplitHostPort(host)
	if err != nil {
		h = host
	}
	if strings.EqualFold(h, "charstle.pro") {
		return true
	}
	if port != strconv.Itoa(s.opt.Config.ProxyPort) {
		return false
	}
	if h == "localhost" || net.ParseIP(h).IsLoopback() {
		return true
	}
	for _, a := range LANAddresses() {
		if h == a.IP {
			return true
		}
	}
	return false
}
