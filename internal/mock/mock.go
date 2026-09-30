package mock

import (
	"charstle/internal/flow"
	"encoding/json"
	"fmt"
	"github.com/dop251/goja"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func FileResponse(path string, c *flow.Context) (*http.Response, error) {
	st, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if st.IsDir() {
		rel := strings.TrimPrefix(c.Target.Path, "/")
		if c.PatternKind == "prefix" {
			prefix := c.Pattern
			if i := strings.Index(prefix, "://"); i >= 0 {
				prefix = prefix[i+3:]
			}
			if i := strings.Index(prefix, "/"); i >= 0 {
				rel = strings.TrimPrefix(c.Target.Path, prefix[i:])
			}
		}
		rel = strings.TrimLeft(rel, "/")
		if rel == "" {
			rel = "index.html"
		}
		root, err := os.OpenRoot(path)
		if err != nil {
			return nil, err
		}
		defer root.Close()
		f, err := root.Open(filepath.FromSlash(rel))
		if err != nil {
			return nil, err
		}
		info, err := f.Stat()
		if err != nil {
			f.Close()
			return nil, err
		}
		if info.IsDir() {
			f.Close()
			return nil, fmt.Errorf("directory listing is disabled")
		}
		return fileResponse(f, rel, info.Size(), c), nil
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	return fileResponse(f, path, st.Size(), c), nil
}
func fileResponse(f *os.File, path string, size int64, c *flow.Context) *http.Response {
	ct := mime.TypeByExtension(filepath.Ext(path))
	if ct == "" {
		ct = "application/octet-stream"
	}
	return &http.Response{StatusCode: 200, Status: "200 OK", Header: http.Header{"Content-Type": {ct}}, Body: f, ContentLength: size, Request: c.Req, Proto: "HTTP/1.1", ProtoMajor: 1, ProtoMinor: 1}
}
func InlineResponse(body, ct string, c *flow.Context) *http.Response {
	return &http.Response{StatusCode: 200, Status: "200 OK", Header: http.Header{"Content-Type": {ct}}, Body: io.NopCloser(strings.NewReader(body)), ContentLength: int64(len(body)), Request: c.Req, Proto: "HTTP/1.1", ProtoMajor: 1, ProtoMinor: 1}
}

type ScriptResult struct {
	Handled bool
	Status  int
	Headers map[string]string
	Body    []byte
	Delay   time.Duration
	Logs    []LogLine
}
type LogLine struct {
	Level string `json:"level"`
	Text  string `json:"text"`
}
type Runner struct {
	Timeout time.Duration
	Source  func(string) (string, error)
	Values  map[string]string
}

func NewRunner() *Runner { return &Runner{Timeout: time.Second} }
func (r *Runner) Run(name string, c *flow.Context) (*ScriptResult, error) {
	if r.Source == nil {
		return nil, fmt.Errorf("script source missing")
	}
	src, err := r.Source(name)
	if err != nil {
		return nil, err
	}
	vm := goja.New()
	result := &ScriptResult{Logs: []LogLine{}}
	console := map[string]any{}
	for _, level := range []string{"log", "warn", "error"} {
		console[level] = func(call goja.FunctionCall) goja.Value {
			parts := []string{}
			for _, v := range call.Arguments {
				parts = append(parts, v.String())
			}
			if len(result.Logs) < 100 {
				result.Logs = append(result.Logs, LogLine{level, strings.Join(parts, " ")})
			}
			return goja.Undefined()
		}
	}
	vm.Set("console", console)
	exports := vm.NewObject()
	vm.Set("exports", exports)
	vm.Set("module", map[string]any{"exports": exports})
	timer := time.AfterFunc(r.Timeout, func() { vm.Interrupt("script exceeded time limit") })
	defer timer.Stop()
	if _, err = vm.RunString(src); err != nil {
		return result, err
	}
	fn, ok := goja.AssertFunction(exports.Get("handle"))
	if !ok {
		return result, fmt.Errorf("script must export exports.handle")
	}
	body := ""
	if c.Req.Body != nil {
		b, e := io.ReadAll(io.LimitReader(c.Req.Body, 8<<20+1))
		if e != nil {
			return result, e
		}
		c.Req.Body.Close()
		c.Req.Body = io.NopCloser(strings.NewReader(string(b)))
		if len(b) > 8<<20 {
			return result, fmt.Errorf("script request body exceeds 8 MiB")
		}
		body = string(b)
	}
	var decoded any
	json.Unmarshal([]byte(body), &decoded)
	headers := map[string]string{}
	for k, v := range c.Req.Header {
		headers[strings.ToLower(k)] = strings.Join(v, ", ")
	}
	query := map[string]string{}
	for k := range c.Target.Query() {
		query[k] = c.Target.Query().Get(k)
	}
	req := map[string]any{"method": c.Req.Method, "url": c.Target.String(), "path": c.Target.Path, "query": query, "headers": headers, "body": body, "json": decoded}
	v, err := fn(goja.Undefined(), vm.ToValue(req), vm.ToValue(map[string]any{"match": c.Match, "clientIp": c.ClientIP, "values": r.Values}))
	if err != nil {
		return result, err
	}
	if goja.IsUndefined(v) || goja.IsNull(v) {
		return result, nil
	}
	obj := v.ToObject(vm)
	result.Handled = true
	result.Status = 200
	result.Headers = map[string]string{}
	if x := obj.Get("status"); x != nil && !goja.IsUndefined(x) {
		result.Status = int(x.ToInteger())
	}
	if result.Status < 200 || result.Status > 599 {
		return result, fmt.Errorf("script status must be 200..599")
	}
	if x := obj.Get("headers"); x != nil && !goja.IsUndefined(x) {
		if err = vm.ExportTo(x, &result.Headers); err != nil {
			return result, err
		}
	}
	if x := obj.Get("body"); x != nil && !goja.IsUndefined(x) {
		if str, ok := x.Export().(string); ok {
			result.Body = []byte(str)
		} else {
			result.Body, err = json.Marshal(x.Export())
			if err != nil {
				return result, err
			}
			result.Headers["Content-Type"] = "application/json"
		}
	}
	if x := obj.Get("delay"); x != nil && !goja.IsUndefined(x) {
		result.Delay = time.Duration(max(0, min(x.ToInteger(), 30000))) * time.Millisecond
	}
	return result, nil
}
