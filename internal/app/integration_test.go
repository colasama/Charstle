package app

import (
	"bytes"
	"charstle/internal/config"
	"charstle/internal/pipeline"
	"charstle/internal/store"
	"compress/gzip"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestProxyAndManagement(t *testing.T) {
	upstream := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/echo":
			w.Header().Set("Content-Type", "application/json")
			b, _ := io.ReadAll(r.Body)
			json.NewEncoder(w).Encode(map[string]any{"method": r.Method, "body": string(b), "host": r.Host, "header": r.Header.Get("X-Test")})
		case "/gzip":
			w.Header().Set("Content-Encoding", "gzip")
			w.Header().Set("Content-Type", "text/plain")
			z := gzip.NewWriter(w)
			z.Write([]byte("compressed hello"))
			z.Close()
		case "/stream":
			w.Header().Set("Content-Type", "text/event-stream")
			io.WriteString(w, "data: first\n\n")
			w.(http.Flusher).Flush()
			time.Sleep(150 * time.Millisecond)
			io.WriteString(w, "data: second\n\n")
		case "/ws":
			c, err := websocket.Accept(w, r, nil)
			if err != nil {
				return
			}
			defer c.CloseNow()
			for {
				kind, data, err := c.Read(r.Context())
				if err != nil {
					return
				}
				if err = c.Write(r.Context(), kind, data); err != nil {
					return
				}
			}
		default:
			io.WriteString(w, "hello")
		}
	}))
	upstream.EnableHTTP2 = true
	upstream.StartTLS()
	defer upstream.Close()
	cfg := config.Default(t.TempDir())
	cfg.Upstream.InsecureTLS = true
	cfg.Capture.BodyCaptureLimitKB = 2
	core, err := New(cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer core.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- core.Proxy.Serve(ctx, ln) }()
	defer func() { cancel(); <-done }()
	admin := httptest.NewServer(core.Admin.Handler())
	defer admin.Close()
	proxyURL, _ := url.Parse("http://" + ln.Addr().String())
	pem, err := os.ReadFile(filepath.Join(cfg.DataDir, "ca", "charstle-ca.pem"))
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(pem)
	tr := &http.Transport{Proxy: http.ProxyURL(proxyURL), TLSClientConfig: &tls.Config{RootCAs: pool}, ForceAttemptHTTP2: true}
	defer tr.CloseIdleConnections()
	client := &http.Client{Transport: tr, Timeout: 5 * time.Second}
	call := func(method, path string, data any) []byte {
		t.Helper()
		var body io.Reader
		if data != nil {
			b, _ := json.Marshal(data)
			body = bytes.NewReader(b)
		}
		req, _ := http.NewRequest(method, admin.URL+path, body)
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != 200 {
			t.Fatalf("%s %s: %d %s", method, path, resp.StatusCode, b)
		}
		return b
	}
	get := func(target string) string {
		t.Helper()
		resp, err := client.Get(target)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != 200 {
			t.Fatalf("%s: %d %s", target, resp.StatusCode, b)
		}
		return string(b)
	}
	t.Run("empty_lists", func(t *testing.T) {
		b := call("GET", "/api/ssl-proxying", nil)
		if !bytes.Contains(b, []byte(`"include":[]`)) {
			t.Fatal(string(b))
		}
		b = call("POST", "/api/compose", pipeline.ComposeRequest{URL: upstream.URL + "/", Method: "GET"})
		if !bytes.Contains(b, []byte(`"ruleHits":[]`)) {
			t.Fatal(string(b))
		}
	})
	t.Run("HTTPS_HTTP2", func(t *testing.T) {
		resp, err := client.Get(upstream.URL + "/")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		io.Copy(io.Discard, resp.Body)
		if resp.ProtoMajor != 2 {
			t.Fatalf("client protocol: %s", resp.Proto)
		}
		time.Sleep(20 * time.Millisecond)
		items := core.Store.List(store.Query{})
		if len(items) == 0 {
			t.Fatal("missing capture")
		}
		s, _ := core.Store.Get(items[0].ID)
		if s.TLS == nil || !s.TLS.Intercepted {
			t.Fatal("missing MITM info")
		}
		if s.RespSize != 5 {
			t.Fatalf("captured %d bytes", s.RespSize)
		}
	})
	t.Run("HTTP", func(t *testing.T) {
		plain := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { io.WriteString(w, r.URL.RequestURI()) }))
		defer plain.Close()
		if got := get(plain.URL + "/path?q=1"); got != "/path?q=1" {
			t.Fatal(got)
		}
	})
	t.Run("streaming", func(t *testing.T) {
		resp, err := client.Get(upstream.URL + "/stream")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b := make([]byte, 13)
		_, err = io.ReadFull(resp.Body, b)
		if err != nil {
			t.Fatal(err)
		}
		if string(b) != "data: first\n\n" {
			t.Fatal(string(b))
		}
		io.Copy(io.Discard, resp.Body)
	})
	t.Run("compressed_capture", func(t *testing.T) {
		get(upstream.URL + "/gzip")
		time.Sleep(20 * time.Millisecond)
		items := core.Store.List(store.Query{})
		s, _ := core.Store.Get(items[0].ID)
		r, err := s.RespBody.OpenDecoded()
		if err != nil {
			t.Fatal(err)
		}
		defer r.Close()
		b, _ := io.ReadAll(r)
		if string(b) != "compressed hello" {
			t.Fatal(string(b))
		}
	})
	var g struct {
		ID string `json:"id"`
	}
	json.Unmarshal(call("POST", "/api/rules", map[string]string{"name": "integration"}), &g)
	saveRules := func(content string) {
		call("PUT", "/api/rules/"+g.ID, map[string]any{"name": "integration", "enabled": true, "content": content})
	}
	t.Run("rules_values_and_rewrite", func(t *testing.T) {
		call("PUT", "/api/values/fixture", map[string]string{"type": "json", "content": `{"ok":true}`})
		saveRules("mock.test mock://{fixture}\nmap.test " + upstream.URL + "\nhost.test host://" + strings.TrimPrefix(upstream.URL, "https://"))
		if get("http://mock.test/") != `{"ok":true}` {
			t.Fatal("mock mismatch")
		}
		if get("https://map.test/") != "hello" {
			t.Fatal("mapRemote failed")
		}
		if get("https://host.test/") != "hello" {
			t.Fatal("host override failed")
		}
	})
	t.Run("scripts", func(t *testing.T) {
		call("PUT", "/api/scripts/demo.js", map[string]string{"content": `exports.handle = function(req) { console.log(req.method); return {status:201,body:{path:req.path}}; }`})
		out := call("POST", "/api/scripts/demo.js/run", pipeline.ComposeRequest{URL: "https://example.com/a", Method: "GET"})
		if !bytes.Contains(out, []byte(`"status":201`)) {
			t.Fatal(string(out))
		}
		saveRules("script.test script://demo.js")
		resp, err := client.Get("http://script.test/a")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != 201 || !bytes.Contains(b, []byte("/a")) {
			t.Fatalf("%d %s", resp.StatusCode, b)
		}
	})
	t.Run("breakpoint_edits", func(t *testing.T) {
		saveRules("")
		call("PUT", "/api/breakpoints", []pipeline.BreakpointRule{{ID: "one", Enabled: true, Pattern: "*/echo", Method: "*", Request: true}})
		reply := make(chan string, 1)
		go func() {
			resp, err := client.Post(upstream.URL+"/echo", "text/plain", strings.NewReader("before"))
			if err != nil {
				reply <- err.Error()
				return
			}
			defer resp.Body.Close()
			b, _ := io.ReadAll(resp.Body)
			reply <- string(b)
		}()
		var paused []pipeline.PausedItem
		deadline := time.Now().Add(3 * time.Second)
		for time.Now().Before(deadline) {
			json.Unmarshal(call("GET", "/api/breakpoints/paused", nil), &paused)
			if len(paused) > 0 {
				break
			}
			time.Sleep(10 * time.Millisecond)
		}
		if len(paused) != 1 {
			t.Fatal("not paused")
		}
		body := "after"
		call("POST", "/api/breakpoints/paused/"+paused[0].ID, pipeline.Resolution{Action: "execute", Body: &body, Header: http.Header{"X-Test": {"yes"}}})
		select {
		case got := <-reply:
			if !strings.Contains(got, "after") || !strings.Contains(got, "yes") {
				t.Fatal(got)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("request stuck")
		}
		call("PUT", "/api/breakpoints", []pipeline.BreakpointRule{})
	})
	t.Run("WebSocket", func(t *testing.T) {
		wsctx, stop := context.WithTimeout(context.Background(), 3*time.Second)
		defer stop()
		wsclient := &http.Client{Transport: &http.Transport{Proxy: http.ProxyURL(proxyURL), TLSClientConfig: &tls.Config{RootCAs: pool}}}
		conn, _, err := websocket.Dial(wsctx, strings.Replace(upstream.URL, "https:", "wss:", 1)+"/ws", &websocket.DialOptions{HTTPClient: wsclient})
		if err != nil {
			t.Fatal(err)
		}
		if err = conn.Write(wsctx, websocket.MessageText, []byte("frame hello")); err != nil {
			t.Fatal(err)
		}
		_, data, err := conn.Read(wsctx)
		if err != nil {
			t.Fatal(err)
		}
		if string(data) != "frame hello" {
			t.Fatal(string(data))
		}
		conn.Close(websocket.StatusNormalClosure, "done")
		time.Sleep(30 * time.Millisecond)
		items := core.Store.List(store.Query{})
		found := false
		for _, sum := range items {
			if sum.Type == "ws" {
				s, _ := core.Store.Get(sum.ID)
				if len(s.Frames) >= 2 {
					found = true
				}
			}
		}
		if !found {
			t.Fatal("missing WebSocket frames")
		}
	})
	t.Run("HAR_compose_replay", func(t *testing.T) {
		data := call("POST", "/api/compose", pipeline.ComposeRequest{URL: upstream.URL + "/echo", Method: "POST", Body: "compose", ViaRules: true})
		var d struct {
			ID uint64 `json:"id"`
		}
		json.Unmarshal(data, &d)
		if d.ID == 0 {
			t.Fatal(string(data))
		}
		call("POST", fmt.Sprintf("/api/sessions/%d/replay", d.ID), map[string]any{})
		har := call("GET", "/api/har", nil)
		items, err := store.ImportHAR(bytes.NewReader(har))
		if err != nil || len(items) == 0 {
			t.Fatalf("%v %s", err, har)
		}
		call("POST", "/api/har", json.RawMessage(har))
	})
	t.Run("management_security", func(t *testing.T) {
		for _, host := range []string{"evil.example", "localhost.evil.example"} {
			req, _ := http.NewRequest("GET", admin.URL+"/api/settings", nil)
			req.Host = host
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			resp.Body.Close()
			if resp.StatusCode != 403 {
				t.Fatal(resp.StatusCode)
			}
		}
		req, _ := http.NewRequest("DELETE", admin.URL+"/api/sessions", nil)
		req.Header.Set("Origin", "https://evil.example")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != 403 {
			t.Fatal(resp.StatusCode)
		}
	})
	t.Run("persistence", func(t *testing.T) {
		saveRules("persist.test mock://{fixture}")
		second, err := New(cfg)
		if err != nil {
			t.Fatal(err)
		}
		defer second.Close()
		res, err := second.Pipeline.Compose(pipeline.ComposeRequest{URL: "http://persist.test/", Method: "GET", ViaRules: true})
		if err != nil {
			t.Fatal(err)
		}
		if !res.Mocked || res.Status != 200 {
			t.Fatalf("%+v", res)
		}
	})
}
