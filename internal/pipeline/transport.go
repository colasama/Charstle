package pipeline

import (
	"charstle/internal/config"
	"charstle/internal/flow"
	"charstle/internal/netutil"
	"charstle/internal/rules"
	"crypto/tls"
	"fmt"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Transport struct {
	cfg config.Upstream
	rt  *http.Transport
}

func NewTransport(cfg config.Upstream) *Transport {
	d := netutil.NewDialer(cfg)
	rt := &http.Transport{DialContext: d.DialContext, TLSClientConfig: &tls.Config{InsecureSkipVerify: cfg.InsecureTLS}, ForceAttemptHTTP2: true, MaxIdleConnsPerHost: 16, IdleConnTimeout: 90 * time.Second, TLSHandshakeTimeout: 15 * time.Second, ResponseHeaderTimeout: 60 * time.Second, DisableCompression: true}
	rt.Proxy = func(r *http.Request) (*url.URL, error) {
		if cfg.Proxy == "" {
			return nil, nil
		}
		for _, p := range cfg.Bypass {
			if rules.Matches(p, r.URL) {
				return nil, nil
			}
		}
		return url.Parse(cfg.Proxy)
	}
	return &Transport{cfg, rt}
}
func stripHop(h http.Header) {
	for _, v := range h.Values("Connection") {
		for _, k := range strings.Split(v, ",") {
			h.Del(strings.TrimSpace(k))
		}
	}
	for _, k := range []string{"Connection", "Proxy-Connection", "Proxy-Authenticate", "Proxy-Authorization", "Keep-Alive", "TE", "Trailer", "Transfer-Encoding", "Upgrade"} {
		h.Del(k)
	}
}
func (t *Transport) RoundTrip(c *flow.Context) error {
	out := c.Req.Clone(c.Req.Context())
	target := *c.Target
	out.URL = &target
	out.RequestURI = ""
	out.Header = c.Req.Header.Clone()
	if c.Session.Remapped && c.DialAddr == "" {
		out.Host = target.Host
	}
	upgrade := strings.EqualFold(out.Header.Get("Upgrade"), "websocket")
	stripHop(out.Header)
	if upgrade {
		out.Header.Set("Connection", "Upgrade")
		out.Header.Set("Upgrade", "websocket")
	}
	rt := t.rt
	if c.DialAddr != "" {
		rt = t.rt.Clone()
		out.URL.Host = c.DialAddr
		rt.TLSClientConfig = rt.TLSClientConfig.Clone()
		rt.TLSClientConfig.ServerName = c.Target.Hostname()
		rt.DisableKeepAlives = true
		defer rt.CloseIdleConnections()
	}
	// HTTP/2 trace callbacks may outlive RoundTrip. Copy their private snapshot
	// under a lock instead of letting callbacks mutate the published session.
	var mu sync.Mutex
	timing, remote := c.Session.Timing, c.Session.Remote
	stamp := func(target *time.Time) { mu.Lock(); *target = time.Now(); mu.Unlock() }
	trace := &httptrace.ClientTrace{DNSStart: func(httptrace.DNSStartInfo) { stamp(&timing.DNSStart) }, DNSDone: func(httptrace.DNSDoneInfo) { stamp(&timing.DNSDone) }, GotConn: func(i httptrace.GotConnInfo) {
		mu.Lock()
		remote = i.Conn.RemoteAddr().String()
		timing.Connect = time.Now()
		mu.Unlock()
	}, TLSHandshakeDone: func(tls.ConnectionState, error) { stamp(&timing.TLSDone) }, WroteRequest: func(httptrace.WroteRequestInfo) { stamp(&timing.WroteReq) }, GotFirstResponseByte: func() { stamp(&timing.TTFB) }}
	out = out.WithContext(httptrace.WithClientTrace(out.Context(), trace))
	resp, err := rt.RoundTrip(out)
	mu.Lock()
	c.Session.Timing, c.Session.Remote = timing, remote
	mu.Unlock()
	c.Resp = resp
	if err != nil {
		return fmt.Errorf("upstream: %w", err)
	}
	return nil
}
func (t *Transport) Close() { t.rt.CloseIdleConnections() }
