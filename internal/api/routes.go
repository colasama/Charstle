package api

import (
	"charstle/internal/config"
	"charstle/internal/flow"
	"charstle/internal/mock"
	"charstle/internal/pipeline"
	"charstle/internal/rules"
	"charstle/internal/store"
	"charstle/internal/sysproxy"
	"context"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func (s *Server) routes() {
	routes := []string{"GET /api/state", "GET /api/sessions", "DELETE /api/sessions", "GET /api/sessions/{id}", "DELETE /api/sessions/{id}", "GET /api/sessions/{id}/body/{kind}", "GET /api/sessions/{id}/frames", "GET /api/sessions/{id}/curl", "POST /api/sessions/{id}/replay", "GET /api/har", "POST /api/har", "PUT /api/recording", "GET /api/rules", "POST /api/rules", "PUT /api/rules/{id}", "DELETE /api/rules/{id}", "PUT /api/rules/order", "POST /api/rules/validate", "POST /api/rules/parse", "GET /api/values", "PUT /api/values/{key}", "DELETE /api/values/{key}", "GET /api/scripts", "PUT /api/scripts/{name}", "DELETE /api/scripts/{name}", "POST /api/scripts/{name}/run", "GET /api/breakpoints", "PUT /api/breakpoints", "GET /api/breakpoints/paused", "PUT /api/breakpoints/enabled", "POST /api/breakpoints/paused/{id}", "POST /api/compose", "GET /api/throttle", "PUT /api/throttle", "GET /api/lan", "GET /api/devices", "PUT /api/devices/{ip}", "GET /api/access", "PUT /api/access", "GET /api/ca", "GET /api/ca/charstle-ca.crt", "GET /api/ca/charstle-ca.pem", "GET /api/ca/charstle.mobileconfig", "POST /api/ca/install", "POST /api/ca/regenerate", "GET /api/ssl-proxying", "PUT /api/ssl-proxying", "GET /api/pinned", "DELETE /api/pinned", "GET /api/settings", "PUT /api/settings", "PUT /api/system-proxy"}
	for _, route := range routes {
		s.mux.HandleFunc(route, s.dispatch)
	}
	s.mux.HandleFunc("GET /api/events", s.events)
}
func (s *Server) events(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer c.CloseNow()
	ctx := c.CloseRead(r.Context())
	ch, cancel := s.d.Bus.Subscribe()
	defer cancel()
	for {
		select {
		case <-ctx.Done():
			return
		case batch, ok := <-ch:
			if !ok {
				return
			}
			send, stop := context.WithTimeout(ctx, 5*time.Second)
			err := wsjson.Write(send, c, batch)
			stop()
			if err != nil {
				return
			}
		}
	}
}
func (s *Server) dispatch(w http.ResponseWriter, r *http.Request) {
	result, err := s.handle(w, r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	if result != nil {
		writeJSON(w, 200, result)
	}
}
func (s *Server) handle(w http.ResponseWriter, r *http.Request) (any, error) {
	path := r.URL.Path
	method := r.Method
	var result any = map[string]bool{"ok": true}
	switch {
	case path == "/api/state":
		s.mu.Lock()
		on := s.previous != nil
		s.mu.Unlock()
		return map[string]any{"proxyPort": s.d.Config.ProxyPort, "adminPort": s.d.Config.AdminPort, "recording": s.d.Store.Recording(), "sslProxying": s.d.Proxy.SSL().Enabled, "breakpoints": s.d.Pipeline.Breakpoints().Enabled(), "throttling": s.d.Pipeline.Throttler().Config().Enabled, "systemProxy": on}, nil
	case path == "/api/events":
		return nil, nil
	case path == "/api/sessions":
		if method == "DELETE" {
			s.d.Store.Clear()
			return result, nil
		}
		return s.d.Store.List(storeQuery(r)), nil
	case strings.HasPrefix(path, "/api/sessions/"):
		id, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
		if err != nil {
			return nil, err
		}
		if method == "DELETE" {
			s.d.Store.Delete(id)
			return result, nil
		}
		sess, ok := s.d.Store.Get(id)
		if !ok {
			return nil, fmt.Errorf("session not found")
		}
		switch {
		case strings.Contains(path, "/body/"):
			kind := r.PathValue("kind")
			body := &sess.RespBody
			header := sess.RespHeader
			if kind == "req" {
				body = &sess.ReqBody
				header = sess.ReqHeader
			} else if kind != "res" {
				return nil, fmt.Errorf("invalid body kind")
			}
			var reader io.ReadCloser
			if r.URL.Query().Get("decode") == "0" {
				reader, err = body.Open()
			} else {
				reader, err = body.OpenDecoded()
			}
			if err != nil {
				return nil, err
			}
			defer reader.Close()
			w.Header().Set("Content-Type", header.Get("Content-Type"))
			w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'")
			w.Header().Set("Content-Disposition", "inline")
			io.Copy(w, reader)
			return nil, nil
		case strings.HasSuffix(path, "/frames"):
			return detail(sess, s.d.Config.Protocol.DecodeBody)["frames"], nil
		case strings.HasSuffix(path, "/curl"):
			return store.Curl(sess)
		case strings.HasSuffix(path, "/replay"):
			v, err := s.d.Pipeline.Replay(id)
			if err != nil {
				return nil, err
			}
			return map[string]uint64{"id": v.ID}, nil
		default:
			return detail(sess, s.d.Config.Protocol.DecodeBody), nil
		}
	case path == "/api/har":
		if method == "POST" {
			items, err := store.ImportHAR(r.Body)
			if err != nil {
				return nil, err
			}
			for _, v := range items {
				v.ID = s.d.Store.NewSession().ID
				s.d.Store.Add(v)
			}
			return map[string]int{"count": len(items)}, nil
		}
		wanted := map[uint64]bool{}
		for _, part := range strings.Split(r.URL.Query().Get("ids"), ",") {
			if part == "" {
				continue
			}
			id, err := strconv.ParseUint(part, 10, 64)
			if err != nil {
				return nil, err
			}
			wanted[id] = true
		}
		items := []*store.Session{}
		for _, sum := range s.d.Store.List(store.Query{}) {
			if len(wanted) > 0 && !wanted[sum.ID] {
				continue
			}
			v, ok := s.d.Store.Get(sum.ID)
			if ok {
				items = append(items, v)
			}
		}
		var buf strings.Builder
		if err := store.ExportHAR(&buf, items); err != nil {
			return nil, err
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", `attachment; filename="charstle.har"`)
		io.WriteString(w, buf.String())
		return nil, nil
	case path == "/api/recording":
		var v struct {
			On bool `json:"on"`
		}
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		s.d.Store.SetRecording(v.On)
	case path == "/api/rules/parse":
		var g rules.Group
		if err := decode(r, &g); err != nil {
			return nil, err
		}
		rs, diags := rules.Parse(g)
		items := []map[string]any{}
		for _, rule := range rs {
			items = append(items, map[string]any{"id": rule.ID, "groupId": g.ID, "line": rule.Line, "enabled": g.Enabled, "pattern": rule.Pattern, "patternKind": rule.PatternKind, "actions": rule.Specs, "filters": append([]string{}, rule.FilterText...), "hitCount": s.d.Rules.Count(rule.ID)})
		}
		return map[string]any{"rules": items, "diagnostics": diags}, nil
	case path == "/api/rules/validate":
		var v struct {
			Content string `json:"content"`
		}
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		return s.d.Rules.Validate(v.Content), nil
	case path == "/api/rules" || strings.HasPrefix(path, "/api/rules/"):
		s.mu.Lock()
		defer s.mu.Unlock()
		groups := s.d.Rules.Groups()
		if method == "GET" {
			return groups, nil
		}
		id := r.PathValue("id")
		if strings.HasSuffix(path, "/order") {
			var ids []string
			if err := decode(r, &ids); err != nil {
				return nil, err
			}
			if len(ids) != len(groups) {
				return nil, fmt.Errorf("order must include every group")
			}
			ordered := []rules.Group{}
			seen := map[string]bool{}
			for _, id := range ids {
				found := false
				for _, g := range groups {
					if g.ID == id && !seen[id] {
						ordered = append(ordered, g)
						seen[id] = true
						found = true
						break
					}
				}
				if !found {
					return nil, fmt.Errorf("invalid group order")
				}
			}
			groups = ordered
		} else if method == "POST" {
			var v struct {
				Name string `json:"name"`
			}
			if err := decode(r, &v); err != nil {
				return nil, err
			}
			if strings.TrimSpace(v.Name) == "" {
				return nil, fmt.Errorf("name is required")
			}
			g := rules.Group{ID: fmt.Sprintf("g%d", time.Now().UnixNano()), Name: v.Name, Enabled: true, UpdatedAt: time.Now().UnixMilli()}
			groups = append(groups, g)
			result = g
		} else {
			index := -1
			for i, g := range groups {
				if g.ID == id {
					index = i
					break
				}
			}
			if index < 0 {
				return nil, fmt.Errorf("rule group not found")
			}
			if method == "DELETE" {
				groups = append(groups[:index], groups[index+1:]...)
			} else {
				var g rules.Group
				if err := decode(r, &g); err != nil {
					return nil, err
				}
				g.ID = id
				g.UpdatedAt = time.Now().UnixMilli()
				rs, diags := rules.Parse(g)
				if len(diags) > 0 {
					return nil, fmt.Errorf("line %d: %s", diags[0].Line, diags[0].Message)
				}
				groups[index] = g
				parsed := []map[string]any{}
				for _, rule := range rs {
					parsed = append(parsed, map[string]any{"id": rule.ID, "groupId": rule.GroupID, "line": rule.Line, "enabled": g.Enabled, "pattern": rule.Pattern, "patternKind": rule.PatternKind, "actions": rule.Specs, "filters": rule.FilterText, "hitCount": 0})
				}
				result = map[string]any{"rules": parsed, "diagnostics": diags}
			}
		}
		if err := config.WriteJSON(filepath.Join(s.d.Config.DataDir, "rules.json"), groups); err != nil {
			return nil, err
		}
		s.d.Rules.Load(groups)
	case strings.HasPrefix(path, "/api/values"):
		if method == "GET" {
			out := []rules.Value{}
			for _, v := range s.d.Values.List() {
				if v.Type != "js" {
					v.UsedBy = s.usedBy("{" + v.Key + "}")
					out = append(out, v)
				}
			}
			return out, nil
		}
		key := r.PathValue("key")
		if strings.HasPrefix(key, "script:") {
			return nil, fmt.Errorf("reserved key prefix")
		}
		if method == "DELETE" {
			return result, s.d.Values.Delete(key)
		}
		var v rules.Value
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		v.Key = key
		switch v.Type {
		case "json", "text", "html", "headers":
		default:
			return nil, fmt.Errorf("invalid value type")
		}
		return result, s.d.Values.Put(v)
	case strings.HasPrefix(path, "/api/scripts"):
		if method == "GET" {
			out := []map[string]any{}
			for _, v := range s.d.Values.List() {
				if v.Type == "js" {
					name := strings.TrimPrefix(v.Key, "script:")
					out = append(out, map[string]any{"name": name, "content": v.Content, "updatedAt": v.UpdatedAt, "usedBy": s.usedBy("script://" + name)})
				}
			}
			return out, nil
		}
		name := r.PathValue("name")
		if strings.HasSuffix(path, "/run") {
			var req pipeline.ComposeRequest
			if err := decode(r, &req); err != nil {
				return nil, err
			}
			request, err := http.NewRequestWithContext(r.Context(), req.Method, req.URL, strings.NewReader(req.Body))
			if err != nil {
				return nil, err
			}
			if request.URL.Host == "" {
				return nil, fmt.Errorf("invalid URL")
			}
			request.Header = req.Header
			runner := mock.NewRunner()
			runner.Source = func(name string) (string, error) {
				v, ok := s.d.Values.Get("script:" + name)
				if !ok {
					return "", fmt.Errorf("script not found")
				}
				return v.Content, nil
			}
			runner.Values = map[string]string{}
			for _, v := range s.d.Values.List() {
				if v.Type != "js" {
					runner.Values[v.Key] = v.Content
				}
			}
			start := time.Now()
			v, err := runner.Run(name, &flow.Context{Req: request, Target: request.URL, ClientIP: "127.0.0.1"})
			out := map[string]any{"ok": err == nil, "duration": time.Since(start).Milliseconds(), "logs": []mock.LogLine{}}
			if err != nil {
				out["error"] = err.Error()
			}
			if v != nil {
				out["body"] = string(v.Body)
				out["status"] = v.Status
				out["headers"] = v.Headers
				out["logs"] = v.Logs
			}
			return out, nil
		}
		if method == "DELETE" {
			return result, s.d.Values.Delete("script:" + name)
		}
		var v struct {
			Content string `json:"content"`
		}
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		return result, s.d.Values.Put(rules.Value{Key: "script:" + name, Type: "js", Content: v.Content})
	case path == "/api/breakpoints/paused":
		return s.d.Pipeline.Breakpoints().Waiting(), nil
	case path == "/api/breakpoints/enabled":
		var v struct {
			On bool `json:"on"`
		}
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		s.d.Pipeline.Breakpoints().SetEnabled(v.On)
	case strings.HasPrefix(path, "/api/breakpoints/paused/"):
		var v pipeline.Resolution
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		return result, s.d.Pipeline.Breakpoints().Resolve(r.PathValue("id"), v)
	case path == "/api/breakpoints":
		if method == "GET" {
			return s.d.Pipeline.Breakpoints().Rules(), nil
		}
		var v []pipeline.BreakpointRule
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		for _, b := range v {
			if _, _, err := rules.Compile(b.Pattern); err != nil {
				return nil, err
			}
		}
		if err := config.WriteJSON(filepath.Join(s.d.Config.DataDir, "breakpoints.json"), v); err != nil {
			return nil, err
		}
		s.d.Pipeline.Breakpoints().SetRules(v)
	case path == "/api/compose":
		var v pipeline.ComposeRequest
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		sess, err := s.d.Pipeline.ComposeContext(r.Context(), v)
		if err != nil {
			return nil, err
		}
		return detail(sess, s.d.Config.Protocol.DecodeBody), nil
	case path == "/api/throttle":
		if method == "GET" {
			return s.d.Pipeline.Throttler().Config(), nil
		}
		var v pipeline.ThrottleConfig
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		if v.Profile.DownKbps < 0 || v.Profile.UpKbps < 0 || v.Profile.LatencyMs < 0 || v.Profile.LatencyMs > 300000 || v.Profile.LossPct < 0 || v.Profile.LossPct > 100 {
			return nil, fmt.Errorf("invalid throttle profile")
		}
		for _, h := range v.Hosts {
			if _, _, err := rules.Compile(h); err != nil {
				return nil, err
			}
		}
		if err := config.WriteJSON(filepath.Join(s.d.Config.DataDir, "throttle.json"), v); err != nil {
			return nil, err
		}
		s.d.Pipeline.Throttler().SetConfig(v)
	case path == "/api/lan":
		addresses := proxyAddresses()
		return addresses, nil
	case path == "/api/devices":
		return s.d.Access.Devices(), nil
	case strings.HasPrefix(path, "/api/devices/"):
		ip := r.PathValue("ip")
		if net.ParseIP(ip) == nil {
			return nil, fmt.Errorf("invalid IP")
		}
		var v struct {
			Status   string  `json:"status"`
			Remember bool    `json:"remember"`
			Name     *string `json:"name"`
		}
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		if v.Name != nil {
			s.d.Access.Rename(ip, *v.Name)
			if err := config.WriteJSON(filepath.Join(s.d.Config.DataDir, "devices.json"), s.d.Access.Names()); err != nil {
				return nil, err
			}
		}
		if v.Status != "" {
			if v.Status != "allowed" && v.Status != "blocked" {
				return nil, fmt.Errorf("invalid status")
			}
			s.d.Access.Decide(ip, v.Status == "allowed", v.Remember)
			if v.Remember {
				return result, s.saveConfig(func(c *config.Config) { c.Access = s.d.Access.Config() })
			}
		}
	case path == "/api/access":
		if method == "GET" {
			return s.d.Access.Config(), nil
		}
		var v config.Access
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		if v.Mode != "ask" && v.Mode != "allowAll" && v.Mode != "whitelist" {
			return nil, fmt.Errorf("invalid access mode")
		}
		for _, ip := range append(v.Whitelist, v.Blacklist...) {
			if net.ParseIP(ip) == nil {
				if _, _, err := net.ParseCIDR(ip); err != nil {
					return nil, err
				}
			}
		}
		if err := s.saveConfig(func(c *config.Config) { c.Access = v }); err != nil {
			return nil, err
		}
		s.d.Access.SetConfig(v)
	case path == "/api/ca":
		return s.caInfo(), nil
	case strings.HasPrefix(path, "/api/ca/"):
		if strings.HasSuffix(path, "/install") {
			return result, s.d.CA.InstallToSystem()
		}
		if strings.HasSuffix(path, "/regenerate") {
			if err := s.d.CA.Regenerate(); err != nil {
				return nil, err
			}
			s.d.Pins.Clear()
			return s.caInfo(), nil
		}
		switch {
		case strings.HasSuffix(path, ".crt"):
			w.Header().Set("Content-Type", "application/x-x509-ca-cert")
			w.Write(s.d.CA.DER())
		case strings.HasSuffix(path, ".pem"):
			w.Header().Set("Content-Type", "application/x-pem-file")
			w.Write(s.d.CA.PEM())
		default:
			b, err := s.d.CA.MobileConfig()
			if err != nil {
				return nil, err
			}
			w.Header().Set("Content-Type", "application/x-apple-aspen-config")
			w.Write(b)
		}
		return nil, nil
	case path == "/api/ssl-proxying":
		if method == "GET" {
			return s.d.Proxy.SSL(), nil
		}
		var v config.SSL
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		for _, p := range append(v.Include, v.Exclude...) {
			if _, _, err := rules.Compile(p); err != nil {
				return nil, err
			}
		}
		if err := s.saveConfig(func(c *config.Config) { c.SSL = v }); err != nil {
			return nil, err
		}
		s.d.Proxy.SetSSL(v)
	case path == "/api/pinned":
		if method == "GET" {
			return s.d.Pins.List(), nil
		}
		hosts := r.URL.Query().Get("hosts")
		if hosts == "" {
			s.d.Pins.Clear()
		} else {
			s.d.Pins.Clear(strings.Split(hosts, ",")...)
		}
	case path == "/api/settings":
		if method == "GET" {
			c, err := config.Load(s.d.Config.DataDir)
			if err != nil {
				return nil, err
			}
			return settings(c), nil
		}
		var fields map[string]json.RawMessage
		if err := decode(r, &fields); err != nil {
			return nil, err
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		c, err := config.Load(s.d.Config.DataDir)
		if err != nil {
			return nil, err
		}
		if err = applySettings(c, fields); err != nil {
			return nil, err
		}
		return map[string]bool{"restartRequired": true}, c.Save()
	case path == "/api/system-proxy":
		var v struct {
			On bool `json:"on"`
		}
		if err := decode(r, &v); err != nil {
			return nil, err
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if v.On && s.previous == nil {
			prev, err := sysproxy.Enable("127.0.0.1", s.d.Config.ProxyPort, s.d.Config.SystemProxyBypass)
			if err != nil {
				return nil, err
			}
			s.previous = &prev
		} else if !v.On && s.previous != nil {
			if err := sysproxy.Restore(*s.previous); err != nil {
				return nil, err
			}
			s.previous = nil
		}
	default:
		return nil, fmt.Errorf("unknown route")
	}
	return result, nil
}
func (s *Server) saveConfig(change func(*config.Config)) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, err := config.Load(s.d.Config.DataDir)
	if err != nil {
		return err
	}
	change(c)
	return c.Save()
}
func (s *Server) caInfo() map[string]any {
	c := s.d.CA.Certificate()
	return map[string]any{"subject": c.Subject.String(), "keyType": "ECDSA P-256", "sha256": s.d.CA.Fingerprint(), "notBefore": c.NotBefore, "notAfter": c.NotAfter, "path": filepath.Join(s.d.CA.Dir, "charstle-ca.pem"), "installedOnHost": s.d.CA.InstalledOnSystem()}
}
func (s *Server) usedBy(ref string) []string {
	out := []string{}
	for _, g := range s.d.Rules.Groups() {
		for i, line := range strings.Split(g.Content, "\n") {
			if strings.Contains(line, ref) {
				out = append(out, fmt.Sprintf("%s:%d", g.Name, i+1))
			}
		}
	}
	return out
}
func fmtBodyURL(id uint64, kind string) string {
	return fmt.Sprintf("/api/sessions/%d/body/%s?decode=1", id, kind)
}
func readSaved(path string, v any) error {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}
