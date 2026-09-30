package pipeline

import (
	"charstle/internal/config"
	"charstle/internal/events"
	"charstle/internal/flow"
	"charstle/internal/rules"
	"charstle/internal/store"
	"context"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Options struct {
	Protocol    config.Protocol
	Rules       *rules.Engine
	Store       *store.Store
	Bus         *events.Bus
	Upstream    config.Upstream
	Breakpoints *Breakpoints
	Throttle    *Throttler
}
type Pipeline struct {
	opt       Options
	transport *Transport
}

func New(opt Options) *Pipeline {
	p := &Pipeline{opt: opt, transport: NewTransport(opt.Upstream)}
	p.transport.rt.ForceAttemptHTTP2 = opt.Protocol.HTTP2
	opt.Breakpoints.update = opt.Store.Update
	return p
}
func (p *Pipeline) Breakpoints() *Breakpoints { return p.opt.Breakpoints }
func (p *Pipeline) Throttler() *Throttler     { return p.opt.Throttle }
func (p *Pipeline) Close()                    { p.transport.Close() }
func (p *Pipeline) HandleRequest(w http.ResponseWriter, r *http.Request, info flow.ConnInfo) {
	p.handle(w, r, info, true, false)
}

type readCloser struct {
	io.Reader
	io.Closer
}
type flushWriter struct{ w http.ResponseWriter }

func (f flushWriter) Write(b []byte) (int, error) {
	n, err := f.w.Write(b)
	if fl, ok := f.w.(http.Flusher); ok {
		fl.Flush()
	}
	return n, err
}
func (p *Pipeline) handle(w http.ResponseWriter, r *http.Request, info flow.ConnInfo, viaRules, redirects bool) *store.Session {
	r = r.Clone(r.Context())
	u := *r.URL
	if u.Scheme == "" {
		u.Scheme = info.Scheme
	}
	if u.Host == "" {
		u.Host = r.Host
	}
	r.URL = &u
	s := p.opt.Store.NewSession()
	s.ClientIP = info.ClientIP
	s.Method = r.Method
	s.Scheme = u.Scheme
	s.Host = u.Host
	s.Path = u.RequestURI()
	s.Proto = r.Proto
	s.URL = u.String()
	s.TLS = info.TLS
	s.ReqHeader = r.Header.Clone()
	s.ReqHeader.Set("Host", r.Host)
	c := &flow.Context{Session: s, ClientIP: info.ClientIP, Req: r, Target: &u}
	p.opt.Store.Add(s)
	defer func() { s.Timing.End = time.Now(); p.opt.Store.Update(s) }()
	fail := func(err error) {
		s.State = store.StateError
		if c.Abort {
			s.State = store.StateAborted
		}
		s.Error = err.Error()
		s.Status = 502
		s.StatusText = http.StatusText(502)
		http.Error(w, err.Error(), 502)
	}
	if u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		fail(fmt.Errorf("only HTTP(S) URLs are supported"))
		return s
	}
	if viaRules {
		if err := p.opt.Rules.Apply(c, flow.PhaseRequest); err != nil {
			fail(err)
			return s
		}
	}
	if c.Abort {
		fail(fmt.Errorf("request blocked by rule"))
		return s
	}
	if err := p.opt.Breakpoints.Pause(c, flow.PhaseRequest); err != nil {
		fail(err)
		return s
	}
	s.Method = c.Req.Method
	s.ReqHeader = c.Req.Header.Clone()
	s.ReqHeader.Set("Host", c.Req.Host)
	if c.Target.String() != s.URL {
		s.FinalURL = c.Target.String()
	}
	throttle := p.opt.Throttle.Config()
	match := throttle.Enabled
	if match && len(throttle.Hosts) > 0 {
		match = false
		for _, h := range throttle.Hosts {
			if rules.Matches(h, c.Target) {
				match = true
				break
			}
		}
	}
	if match {
		c.Delay += time.Duration(throttle.Profile.LatencyMs) * time.Millisecond
		s.Throttled = true
		if throttle.Profile.LossPct > 0 && rand.Float64()*100 < throttle.Profile.LossPct {
			fail(fmt.Errorf("simulated request loss"))
			return s
		}
	}
	if err := wait(r.Context(), c.Delay); err != nil {
		fail(err)
		return s
	}
	reqCapture := store.NewCapture(c.Req.Body, p.opt.Store.CaptureLimit())
	defer reqCapture.Close()
	c.Req.Body = reqCapture
	if match {
		c.Req.Body = readCloser{pace(r.Context(), reqCapture, int64(throttle.Profile.UpKbps)*1000/8), reqCapture}
	}
	s.ReqBody.Encoding = c.Req.Header.Get("Content-Encoding")
	var upstreamErr error
	if !c.ShortCircuit {
		if viaRules {
			if err := p.opt.Rules.Apply(c, flow.PhaseDial); err != nil {
				fail(err)
				return s
			}
		}
		if p.opt.Protocol.CaptureWebSocket && strings.EqualFold(c.Req.Header.Get("Upgrade"), "websocket") {
			// Inspect uncompressed frames without altering bytes after negotiation.
			c.Req.Header.Del("Sec-WebSocket-Extensions")
		}
		upstreamErr = p.transport.RoundTrip(c)
		if redirects && upstreamErr == nil {
			for i := 0; isRedirect(c.Resp.StatusCode) && c.Resp.Header.Get("Location") != ""; i++ {
				if i == 10 {
					upstreamErr = fmt.Errorf("stopped after 10 redirects")
					break
				}
				next, err := c.Target.Parse(c.Resp.Header.Get("Location"))
				if err != nil {
					upstreamErr = err
					break
				}
				c.Resp.Body.Close()
				if next.Scheme != "http" && next.Scheme != "https" {
					upstreamErr = fmt.Errorf("invalid redirect scheme")
					break
				}
				if next.Host != c.Target.Host {
					c.Req.Header.Del("Authorization")
					c.Req.Header.Del("Cookie")
					c.DialAddr = ""
				}
				preserve := c.Resp.StatusCode == 307 || c.Resp.StatusCode == 308
				if preserve && c.Req.ContentLength != 0 {
					if c.Req.GetBody == nil {
						upstreamErr = fmt.Errorf("redirect body cannot be replayed")
						break
					}
					c.Req.Body, upstreamErr = c.Req.GetBody()
					if upstreamErr != nil {
						break
					}
				} else {
					if !preserve && c.Req.Method != "HEAD" {
						c.Req.Method = "GET"
					}
					c.Req.Body = http.NoBody
					c.Req.ContentLength = 0
					c.Req.Header.Del("Content-Length")
					c.Req.TransferEncoding = nil
				}
				c.Req.Host = next.Host
				c.Target = next
				upstreamErr = p.transport.RoundTrip(c)
				if upstreamErr != nil {
					break
				}
			}
		}
	} else {
		s.Mocked = true
		_, upstreamErr = io.Copy(io.Discard, c.Req.Body)
	}
	c.Req.Body.Close()
	s.ReqBody = reqCapture.Snapshot()
	s.ReqBody.Encoding = r.Header.Get("Content-Encoding")
	s.ReqSize = s.ReqBody.Size
	if upstreamErr != nil {
		if c.Resp != nil {
			c.Resp.Body.Close()
		}
		fail(upstreamErr)
		return s
	}
	if viaRules {
		if err := p.opt.Rules.Apply(c, flow.PhaseResponse); err != nil {
			if c.Resp != nil {
				c.Resp.Body.Close()
			}
			fail(err)
			return s
		}
	}
	if c.Resp == nil {
		if upstreamErr == nil {
			upstreamErr = fmt.Errorf("empty upstream response")
		}
		fail(upstreamErr)
		return s
	}
	defer c.Resp.Body.Close()
	if err := p.opt.Breakpoints.Pause(c, flow.PhaseResponse); err != nil {
		fail(err)
		return s
	}
	resp := c.Resp
	s.Status = resp.StatusCode
	s.StatusText = http.StatusText(resp.StatusCode)
	s.RespHeader = resp.Header.Clone()
	if s.Timing.TTFB.IsZero() {
		s.Timing.TTFB = time.Now()
	}
	if resp.StatusCode == 101 && strings.EqualFold(resp.Header.Get("Upgrade"), "websocket") {
		s.Proto = "WebSocket"
		if err := p.websocket(w, c); err != nil {
			s.Error = err.Error()
			s.State = store.StateError
		} else {
			s.State = store.StateDone
		}
		return s
	}
	stripHop(resp.Header)
	for k, vs := range resp.Header {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	if resp.ContentLength >= 0 {
		w.Header().Set("Content-Length", fmt.Sprint(resp.ContentLength))
	}
	s.RespBody.Encoding = resp.Header.Get("Content-Encoding")
	capture := store.NewCapture(resp.Body, p.opt.Store.CaptureLimit())
	rate := c.ThrottleBytes
	if rate == 0 && match {
		rate = int64(throttle.Profile.DownKbps) * 1000 / 8
	}
	w.WriteHeader(resp.StatusCode)
	p.opt.Store.Update(s)
	_, err := io.Copy(flushWriter{w}, pace(r.Context(), capture, rate))
	capture.Close()
	s.RespBody = capture.Snapshot()
	s.RespBody.Encoding = resp.Header.Get("Content-Encoding")
	s.RespSize = s.RespBody.Size
	s.State = store.StateDone
	if err != nil {
		s.State = store.StateError
		s.Error = err.Error()
	}
	return s
}

func isRedirect(status int) bool {
	return status == 301 || status == 302 || status == 303 || status == 307 || status == 308
}

type ComposeRequest struct {
	Method          string      `json:"method"`
	URL             string      `json:"url"`
	Header          http.Header `json:"headers"`
	Body            string      `json:"body"`
	ViaRules        bool        `json:"viaRules"`
	FollowRedirects bool        `json:"followRedirects"`
	TimeoutMs       int         `json:"timeoutMs"`
}
type discardResponse struct {
	header http.Header
	status int
}

func (w *discardResponse) Header() http.Header         { return w.header }
func (w *discardResponse) WriteHeader(status int)      { w.status = status }
func (w *discardResponse) Write(p []byte) (int, error) { return len(p), nil }
func (p *Pipeline) Compose(req ComposeRequest) (*store.Session, error) {
	return p.ComposeContext(context.Background(), req)
}
func (p *Pipeline) ComposeContext(parent context.Context, req ComposeRequest) (*store.Session, error) {
	u, err := url.Parse(req.URL)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, fmt.Errorf("a valid HTTP(S) URL is required")
	}
	timeout := req.TimeoutMs
	if timeout <= 0 {
		timeout = 30000
	}
	ctx, cancel := context.WithTimeout(parent, time.Duration(min(timeout, 300000))*time.Millisecond)
	defer cancel()
	r, err := http.NewRequestWithContext(ctx, req.Method, req.URL, strings.NewReader(req.Body))
	if err != nil {
		return nil, err
	}
	r.Header = req.Header.Clone()
	if r.Header == nil {
		r.Header = make(http.Header)
	}
	if host := r.Header.Get("Host"); host != "" {
		r.Host = host
		r.Header.Del("Host")
	}
	return p.handle(&discardResponse{header: make(http.Header)}, r, flow.ConnInfo{ClientIP: "127.0.0.1", Scheme: u.Scheme}, req.ViaRules, req.FollowRedirects), nil
}
func (p *Pipeline) Replay(id uint64) (*store.Session, error) {
	s, ok := p.opt.Store.Get(id)
	if !ok {
		return nil, fmt.Errorf("session not found")
	}
	if s.ReqBody.Truncated {
		return nil, fmt.Errorf("cannot replay a truncated request")
	}
	r, err := s.ReqBody.Open()
	if err != nil {
		return nil, err
	}
	defer r.Close()
	b, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}
	return p.Compose(ComposeRequest{Method: s.Method, URL: s.URL, Header: s.ReqHeader, Body: string(b), ViaRules: true})
}
