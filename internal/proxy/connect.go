package proxy

import (
	"bufio"
	"bytes"
	"charstle/internal/flow"
	"charstle/internal/netutil"
	"charstle/internal/rules"
	"charstle/internal/store"
	"context"
	"crypto/tls"
	"fmt"
	"golang.org/x/net/http2"
	xproxy "golang.org/x/net/proxy"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

func (s *Server) handleConnect(w http.ResponseWriter, r *http.Request, ip string) {
	host := r.URL.Host
	if _, _, err := net.SplitHostPort(host); err != nil {
		http.Error(w, "CONNECT requires host:port", 400)
		return
	}
	h, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "CONNECT requires HTTP/1.1", 400)
		return
	}
	conn, buf, err := h.Hijack()
	if err != nil {
		return
	}
	defer conn.Close()
	s.mu.Lock()
	s.conns[conn] = true
	s.mu.Unlock()
	defer func() { s.mu.Lock(); delete(s.conns, conn); s.mu.Unlock() }()
	fmt.Fprint(buf, "HTTP/1.1 200 Connection Established\r\n\r\n")
	if err = buf.Flush(); err != nil {
		return
	}
	// Detach net/http's connection reader before sniffing with a deadline;
	// its timeout handling otherwise cancels the CONNECT request context.
	queued := make([]byte, buf.Reader.Buffered())
	io.ReadFull(buf.Reader, queued)
	buf.Reader = bufio.NewReader(io.MultiReader(bytes.NewReader(queued), conn))
	conn.SetReadDeadline(time.Now().Add(time.Second))
	first, err := buf.Peek(1)
	conn.SetReadDeadline(time.Time{})
	if err != nil {
		if timeout, ok := err.(net.Error); ok && timeout.Timeout() {
			// Banner-first protocols wait for the server before sending any data.
			s.tunnel(r.Context(), conn, buf.Reader, host, ip)
		}
		return
	}
	if first[0] == 0x16 && s.shouldIntercept(host) {
		s.serveMITM(r.Context(), conn, buf.Reader, host, ip)
		return
	}
	if first[0] >= 'A' && first[0] <= 'Z' {
		conn.SetReadDeadline(time.Now().Add(time.Second))
		prefix, _ := buf.Peek(4)
		conn.SetReadDeadline(time.Time{})
		switch string(prefix) {
		case "GET ", "POST", "PUT ", "HEAD", "DELE", "PATC", "OPTI", "TRAC", "CONN":
			s.serveHTTPConn(r.Context(), &bufferedConn{Conn: conn, r: buf.Reader}, host, flow.ConnInfo{ClientIP: ip, Scheme: "http"})
			return
		}
	}
	s.tunnel(r.Context(), conn, buf.Reader, host, ip)
}

type bufferedConn struct {
	net.Conn
	r io.Reader
}

func (c *bufferedConn) Read(b []byte) (int, error) { return c.r.Read(b) }
func (s *Server) shouldIntercept(host string) bool {
	cfg := s.SSL()
	if !cfg.Enabled || s.opt.Pins.ShouldBypass(host) {
		return false
	}
	u := &url.URL{Scheme: "https", Host: host, Path: "/"}
	bare := *u
	bare.Host = u.Hostname()
	for _, p := range cfg.Exclude {
		if rules.Matches(p, u) || rules.Matches(p, &bare) {
			return false
		}
	}
	if len(cfg.Include) == 0 {
		return true
	}
	for _, p := range cfg.Include {
		if rules.Matches(p, u) || rules.Matches(p, &bare) {
			return true
		}
	}
	return false
}
func (s *Server) serveMITM(ctx context.Context, conn net.Conn, br *bufio.Reader, host, ip string) {
	hostname, _, _ := net.SplitHostPort(host)
	tc := tls.Server(&bufferedConn{Conn: conn, r: br}, s.opt.Certs.ServerTLSConfig(hostname, s.opt.Config.Protocol.HTTP2))
	handshake, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := tc.HandshakeContext(handshake); err != nil {
		if strings.Contains(err.Error(), "certificate") || strings.Contains(err.Error(), "unknown ca") {
			s.opt.Pins.RecordFailure(host, err.Error(), ip)
		}
		return
	}
	state := tc.ConnectionState()
	info := flow.ConnInfo{ClientIP: ip, Scheme: "https", TLS: &store.TLSInfo{Version: tls.VersionName(state.Version), Cipher: tls.CipherSuiteName(state.CipherSuite), SNI: state.ServerName, ALPN: state.NegotiatedProtocol, Intercepted: true}}
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host == "" {
			r.Host = host
		}
		s.opt.Handler.HandleRequest(w, r, info)
	})
	if state.NegotiatedProtocol == "h2" {
		(&http2.Server{}).ServeConn(tc, &http2.ServeConnOpts{Context: ctx, Handler: handler})
		return
	}
	s.serveHTTPConn(ctx, tc, host, info)
}

type oneListener struct {
	conn   net.Conn
	once   sync.Once
	closed chan struct{}
}
type closingConn struct {
	net.Conn
	once   sync.Once
	closed chan struct{}
}

func (c *closingConn) Close() error { c.once.Do(func() { close(c.closed) }); return c.Conn.Close() }
func (l *oneListener) Accept() (net.Conn, error) {
	var conn net.Conn
	l.once.Do(func() { conn = l.conn })
	if conn != nil {
		return conn, nil
	}
	<-l.closed
	return nil, net.ErrClosed
}
func (l *oneListener) Close() error   { return l.conn.Close() }
func (l *oneListener) Addr() net.Addr { return l.conn.LocalAddr() }
func (s *Server) serveHTTPConn(ctx context.Context, conn net.Conn, host string, info flow.ConnInfo) {
	closed := make(chan struct{})
	cc := &closingConn{Conn: conn, closed: closed}
	ln := &oneListener{conn: cc, closed: closed}
	srv := &http.Server{ReadHeaderTimeout: 15 * time.Second, IdleTimeout: 90 * time.Second, BaseContext: func(net.Listener) context.Context { return ctx }, Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host == "" {
			r.Host = host
		}
		s.opt.Handler.HandleRequest(w, r, info)
	})}
	srv.Serve(ln)
}
func (s *Server) dialTunnel(ctx context.Context, host string) (net.Conn, error) {
	cfg := s.opt.Config.Upstream
	d := netutil.NewDialer(cfg)
	use := cfg.Proxy != ""
	for _, p := range cfg.Bypass {
		if rules.Matches(p, &url.URL{Host: host, Path: "/"}) {
			use = false
		}
	}
	if !use {
		return d.DialContext(ctx, "tcp", host)
	}
	u, err := url.Parse(cfg.Proxy)
	if err != nil {
		return nil, err
	}
	if u.Scheme == "socks5" || u.Scheme == "socks5h" {
		dialer, err := xproxy.FromURL(u, d)
		if err != nil {
			return nil, err
		}
		return dialer.(xproxy.ContextDialer).DialContext(ctx, "tcp", host)
	}
	addr := u.Host
	if u.Port() == "" {
		port := "80"
		if u.Scheme == "https" {
			port = "443"
		}
		addr = net.JoinHostPort(u.Hostname(), port)
	}
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, err
	}
	if u.Scheme == "https" {
		tc := tls.Client(conn, &tls.Config{ServerName: u.Hostname(), MinVersion: tls.VersionTLS12})
		if err = tc.HandshakeContext(ctx); err != nil {
			conn.Close()
			return nil, err
		}
		conn = tc
	}
	req := &http.Request{Method: "CONNECT", URL: &url.URL{Opaque: host}, Host: host, Header: make(http.Header)}
	if u.User != nil {
		pass, _ := u.User.Password()
		req.SetBasicAuth(u.User.Username(), pass)
		req.Header.Set("Proxy-Authorization", req.Header.Get("Authorization"))
		req.Header.Del("Authorization")
	}
	conn.SetDeadline(time.Now().Add(15 * time.Second))
	if err = req.Write(conn); err != nil {
		conn.Close()
		return nil, err
	}
	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, req)
	if err != nil {
		conn.Close()
		return nil, err
	}
	if resp.StatusCode != 200 {
		conn.Close()
		return nil, fmt.Errorf("upstream CONNECT: %s", resp.Status)
	}
	conn.SetDeadline(time.Time{})
	return &bufferedConn{Conn: conn, r: br}, nil
}
func (s *Server) tunnel(ctx context.Context, conn net.Conn, br *bufio.Reader, host, ip string) {
	up, err := s.dialTunnel(ctx, host)
	if err != nil {
		return
	}
	defer up.Close()
	sess := s.opt.Store.NewSession()
	sess.ClientIP = ip
	sess.Method = "CONNECT"
	sess.Scheme = "https"
	sess.Host = host
	sess.URL = "https://" + host
	sess.Path = "/"
	sess.Proto = "TCP"
	sess.State = store.StateTunnel
	if s.opt.Config.Capture.RecordTunnels {
		s.opt.Store.Add(sess)
	}
	type result struct {
		dir string
		n   int64
	}
	done := make(chan result, 2)
	go func() { n, _ := io.Copy(up, br); done <- result{"out", n} }()
	go func() { n, _ := io.Copy(conn, up); done <- result{"in", n} }()
	first := <-done
	conn.Close()
	up.Close()
	second := <-done
	for _, x := range []result{first, second} {
		if x.dir == "out" {
			sess.ReqSize = x.n
		} else {
			sess.RespSize = x.n
		}
	}
	sess.Timing.End = time.Now()
	s.opt.Store.Update(sess)
}
