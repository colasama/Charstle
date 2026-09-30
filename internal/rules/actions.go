package rules

import (
	"charstle/internal/flow"
	"charstle/internal/mock"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type action struct {
	kind, value string
	values      *ValueStore
}

func newAction(kind, value string, values *ValueStore) (Action, error) {
	switch kind {
	case "host", "mapRemote", "file", "mock", "script", "reqHeaders", "resHeaders", "reqBody", "resBody", "statusCode", "delay", "throttle", "block", "cors":
	default:
		return nil, fmt.Errorf("unknown action %q", kind)
	}
	switch kind {
	case "delay":
		n, err := strconv.Atoi(value)
		if err != nil || n < 0 || n > 300000 {
			return nil, fmt.Errorf("delay must be 0..300000 ms")
		}
	case "statusCode":
		n, err := strconv.Atoi(value)
		if err != nil || n < 200 || n > 599 {
			return nil, fmt.Errorf("statusCode must be 200..599")
		}
	case "throttle":
		if _, err := rate(value); err != nil {
			return nil, err
		}
	case "mapRemote":
		u, err := url.Parse(value)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return nil, fmt.Errorf("mapRemote requires an HTTP(S) URL")
		}
	}
	return &action{kind, value, values}, nil
}
func (a *action) Kind() string { return a.kind }
func (a *action) Phase() flow.Phase {
	switch a.kind {
	case "host":
		return flow.PhaseDial
	case "resHeaders", "resBody", "statusCode", "throttle", "cors":
		return flow.PhaseResponse
	}
	return flow.PhaseRequest
}
func rate(raw string) (int64, error) {
	s := strings.ToLower(raw)
	mult := float64(1)
	for _, unit := range []struct {
		s string
		m float64
	}{{"mb", 1 << 20}, {"kb", 1 << 10}, {"b", 1}} {
		if strings.HasSuffix(s, unit.s) {
			s = strings.TrimSuffix(s, unit.s)
			mult = unit.m
			break
		}
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil || n <= 0 || n > 1e9 {
		return 0, fmt.Errorf("invalid throttle rate")
	}
	return int64(n * mult), nil
}
func (a *action) Apply(c *flow.Context) error {
	value := a.value
	resolve := func() (string, error) { return a.values.Resolve(value) }
	switch a.kind {
	case "host":
		if _, _, err := net.SplitHostPort(value); err != nil {
			port := c.Target.Port()
			if port == "" {
				port = "80"
				if c.Target.Scheme == "https" {
					port = "443"
				}
			}
			value = net.JoinHostPort(strings.Trim(value, "[]"), port)
		}
		c.DialAddr = value
		c.Session.Remapped = true
		c.Session.FinalURL = c.Target.Scheme + "://" + value + c.Target.RequestURI()
	case "mapRemote":
		target := value
		if c.PatternKind == "regex" {
			p := c.Pattern[1:strings.LastIndex(c.Pattern, "/")]
			if strings.HasSuffix(c.Pattern, "/i") {
				p = "(?i)" + p
			}
			re, err := regexp.Compile(p)
			if err != nil {
				return err
			}
			target = re.ReplaceAllString(c.Req.URL.String(), value)
		} else if c.PatternKind == "prefix" && len(c.Match) > 1 {
			target += c.Match[1]
		} else if c.PatternKind == "domain" {
			u, _ := url.Parse(value)
			if u.Path == "" || u.Path == "/" {
				u.Path = c.Target.Path
				u.RawQuery = c.Target.RawQuery
				target = u.String()
			}
		}
		u, err := url.Parse(target)
		if err != nil {
			return err
		}
		c.Target = u
		c.Session.Remapped = true
		c.Session.FinalURL = u.String()
	case "file":
		resp, err := mock.FileResponse(value, c)
		if err != nil {
			return err
		}
		c.Resp = resp
		c.ShortCircuit = true
	case "mock":
		body, err := resolve()
		if err != nil {
			return err
		}
		ct := "text/plain; charset=utf-8"
		if v, ok := a.values.Get(strings.Trim(value, "{}")); ok {
			switch v.Type {
			case ValueJSON:
				ct = "application/json"
			case ValueHTML:
				ct = "text/html; charset=utf-8"
			}
		}
		c.Resp = mock.InlineResponse(body, ct, c)
		c.ShortCircuit = true
	case "script":
		runner := mock.NewRunner()
		runner.Source = func(name string) (string, error) {
			v, ok := a.values.Get("script:" + name)
			if !ok {
				return "", fmt.Errorf("script not found: %s", name)
			}
			return v.Content, nil
		}
		runner.Values = map[string]string{}
		for _, v := range a.values.List() {
			if v.Type != "js" {
				runner.Values[v.Key] = v.Content
			}
		}
		result, err := runner.Run(value, c)
		if err != nil {
			return err
		}
		if result.Handled {
			c.Resp = mock.InlineResponse(string(result.Body), "text/plain; charset=utf-8", c)
			c.Resp.StatusCode = result.Status
			for k, v := range result.Headers {
				c.Resp.Header.Set(k, v)
			}
			c.Delay += result.Delay
			c.ShortCircuit = true
		}
	case "reqHeaders", "resHeaders":
		text, err := resolve()
		if err != nil {
			return err
		}
		h := c.Req.Header
		if a.kind == "resHeaders" {
			if c.Resp == nil {
				return nil
			}
			h = c.Resp.Header
		}
		for _, line := range strings.Split(text, "\n") {
			k, v, ok := strings.Cut(line, ":")
			if !ok {
				if strings.TrimSpace(line) != "" {
					return fmt.Errorf("invalid header: %s", line)
				}
				continue
			}
			k = strings.TrimSpace(k)
			v = strings.TrimSpace(v)
			if strings.ContainsAny(k+v, "\r\n") {
				return fmt.Errorf("invalid header")
			}
			if v == "" {
				h.Del(k)
			} else {
				h.Set(k, v)
			}
			if strings.EqualFold(k, "Host") && a.kind == "reqHeaders" {
				c.Req.Host = v
			}
		}
	case "reqBody", "resBody":
		body, err := resolve()
		if err != nil {
			return err
		}
		if a.kind == "reqBody" {
			if c.Req.Body != nil {
				c.Req.Body.Close()
			}
			c.Req.Body = io.NopCloser(strings.NewReader(body))
			c.Req.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(strings.NewReader(body)), nil }
			c.Req.ContentLength = int64(len(body))
			c.Req.Header.Del("Content-Encoding")
			c.Req.Header.Del("Content-Length")
			c.Req.TransferEncoding = nil
		} else {
			if c.Resp == nil {
				c.Resp = mock.InlineResponse(body, "text/plain", c)
			} else {
				c.Resp.Body.Close()
				c.Resp.Body = io.NopCloser(strings.NewReader(body))
				c.Resp.ContentLength = int64(len(body))
			}
			c.Resp.Header.Del("Content-Encoding")
			c.Resp.Header.Del("Content-Length")
			c.Resp.TransferEncoding = nil
		}
	case "delay":
		n, _ := strconv.Atoi(value)
		c.Delay = time.Duration(n) * time.Millisecond
	case "block":
		c.Abort = true
	case "statusCode":
		n, _ := strconv.Atoi(value)
		if c.Resp == nil {
			c.Resp = mock.InlineResponse("", "text/plain", c)
		}
		c.Resp.StatusCode = n
		c.Resp.Status = fmt.Sprintf("%d %s", n, http.StatusText(n))
	case "throttle":
		n, err := rate(value)
		if err != nil {
			return err
		}
		c.ThrottleBytes = n
		c.Session.Throttled = true
	case "cors":
		if c.Resp == nil {
			c.Resp = mock.InlineResponse("", "text/plain", c)
		}
		h := c.Resp.Header
		origin := c.Req.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		h.Set("Access-Control-Allow-Origin", origin)
		h.Add("Vary", "Origin")
		h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
		h.Set("Access-Control-Allow-Headers", c.Req.Header.Get("Access-Control-Request-Headers"))
		if origin != "*" {
			h.Set("Access-Control-Allow-Credentials", "true")
		}
		if c.Req.Method == "OPTIONS" {
			c.Resp.Body.Close()
			c.Resp.Body = http.NoBody
			c.Resp.ContentLength = 0
			c.Resp.StatusCode = 204
			c.Resp.Header.Del("Content-Length")
		}
	}
	return nil
}
