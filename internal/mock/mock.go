// Package mock 生成本地响应：Map Local 文件、Values 内联数据、JS 脚本。
package mock

import (
	"errors"
	"net/http"
	"time"

	"charstle/internal/flow"
)

// FileResponse 读取本地文件（或目录下的对应文件）构造响应，按扩展名推断 Content-Type。
func FileResponse(path string, ctx *flow.Context) (*http.Response, error) {
	// TODO
	return nil, errors.New("FileResponse: not implemented")
}

// InlineResponse 用字符串内容构造 200 响应。
func InlineResponse(body, contentType string, ctx *flow.Context) *http.Response {
	// TODO
	return nil
}

// ---- JS 脚本（goja） ----

// ScriptResult 对应脚本 handle() 的返回值；返回 undefined 时 Handled=false，请求继续发往上游。
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

// Runner 执行 Mock 脚本：隔离运行时（无 fs / 网络）、超时 1s、VM 池复用。
type Runner struct {
	Timeout time.Duration
	// TODO: 脚本源码来源（ValueStore / 目录）、编译缓存、goja.Runtime 池
}

func NewRunner() *Runner {
	return &Runner{Timeout: time.Second}
}

// Run 执行脚本 name 的 exports.handle(req, ctx)。
// 注入 req: { method, url, path, query, headers, body, json }
// 注入 ctx: { match, clientIp, values }
func (r *Runner) Run(name string, ctx *flow.Context) (*ScriptResult, error) {
	// TODO
	return nil, errors.New("Runner.Run: not implemented")
}
