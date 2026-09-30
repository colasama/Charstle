package rules

import (
	"fmt"

	"charstle/internal/flow"
)

// newAction 按 kind 构造动作。与前端 mock/data.ts 的 actionDocs 保持一致。
func newAction(kind, value string, values *ValueStore) (Action, error) {
	switch kind {
	case "host":
		return &hostAction{addr: value}, nil
	case "mapRemote", "http", "https":
		return &mapRemoteAction{target: value}, nil
	case "file":
		return &fileAction{path: value}, nil
	case "mock":
		return &mockAction{ref: value, values: values}, nil
	case "script":
		return &scriptAction{name: value}, nil
	case "reqHeaders":
		return &headersAction{ref: value, values: values, phase: flow.PhaseRequest}, nil
	case "resHeaders":
		return &headersAction{ref: value, values: values, phase: flow.PhaseResponse}, nil
	case "reqBody":
		return &bodyAction{ref: value, values: values, phase: flow.PhaseRequest}, nil
	case "resBody":
		return &bodyAction{ref: value, values: values, phase: flow.PhaseResponse}, nil
	case "statusCode":
		return &statusAction{raw: value}, nil
	case "delay":
		return &delayAction{raw: value}, nil
	case "throttle":
		return &throttleAction{raw: value}, nil
	case "block":
		return &blockAction{}, nil
	case "cors":
		return &corsAction{}, nil
	}
	return nil, fmt.Errorf("未知动作 %q", kind)
}

// ---- 连接阶段 ----

// hostAction：只改 DNS 解析结果，保留 Host 头与 SNI。
type hostAction struct{ addr string }

func (a *hostAction) Kind() string                  { return "host" }
func (a *hostAction) Phase() flow.Phase             { return flow.PhaseDial }
func (a *hostAction) Apply(ctx *flow.Context) error { ctx.DialAddr = a.addr; return nil } // TODO: 补默认端口

// ---- 请求阶段 ----

// mapRemoteAction：改写整个 URL；前缀匹配时拼接剩余路径，正则时支持 $1 替换。
type mapRemoteAction struct{ target string }

func (a *mapRemoteAction) Kind() string      { return "mapRemote" }
func (a *mapRemoteAction) Phase() flow.Phase { return flow.PhaseRequest }
func (a *mapRemoteAction) Apply(ctx *flow.Context) error {
	// TODO: 计算新 URL → ctx.Target；ctx.Session.Remapped = true；ctx.Session.FinalURL
	return nil
}

// fileAction：Map Local，路径是目录时拼接剩余路径。
type fileAction struct{ path string }

func (a *fileAction) Kind() string      { return "file" }
func (a *fileAction) Phase() flow.Phase { return flow.PhaseRequest }
func (a *fileAction) Apply(ctx *flow.Context) error {
	// TODO: mock.FileResponse(path, ctx) → ctx.Resp；ctx.ShortCircuit = true
	return nil
}

type mockAction struct {
	ref    string
	values *ValueStore
}

func (a *mockAction) Kind() string      { return "mock" }
func (a *mockAction) Phase() flow.Phase { return flow.PhaseRequest }
func (a *mockAction) Apply(ctx *flow.Context) error {
	// TODO: values.Resolve(ref) → 按 Value 类型设置 Content-Type → ctx.Resp；ctx.ShortCircuit = true
	return nil
}

type scriptAction struct{ name string }

func (a *scriptAction) Kind() string      { return "script" }
func (a *scriptAction) Phase() flow.Phase { return flow.PhaseRequest }
func (a *scriptAction) Apply(ctx *flow.Context) error {
	// TODO: mock.Scripts.Run(name, ctx)；返回 undefined 时不短路
	return nil
}

type headersAction struct {
	ref    string
	values *ValueStore
	phase  flow.Phase
}

func (a *headersAction) Kind() string {
	if a.phase == flow.PhaseRequest {
		return "reqHeaders"
	}
	return "resHeaders"
}
func (a *headersAction) Phase() flow.Phase { return a.phase }
func (a *headersAction) Apply(ctx *flow.Context) error {
	// TODO: 解析 "name: value" 行；值为空则删除该头
	return nil
}

type bodyAction struct {
	ref    string
	values *ValueStore
	phase  flow.Phase
}

func (a *bodyAction) Kind() string {
	if a.phase == flow.PhaseRequest {
		return "reqBody"
	}
	return "resBody"
}
func (a *bodyAction) Phase() flow.Phase { return a.phase }
func (a *bodyAction) Apply(ctx *flow.Context) error {
	// TODO: 替换 body 并修正 Content-Length，去掉 Content-Encoding
	return nil
}

type delayAction struct{ raw string }

func (a *delayAction) Kind() string      { return "delay" }
func (a *delayAction) Phase() flow.Phase { return flow.PhaseRequest }
func (a *delayAction) Apply(ctx *flow.Context) error {
	// TODO: 解析毫秒 → ctx.Delay
	return nil
}

type blockAction struct{}

func (a *blockAction) Kind() string                  { return "block" }
func (a *blockAction) Phase() flow.Phase             { return flow.PhaseRequest }
func (a *blockAction) Apply(ctx *flow.Context) error { ctx.Abort = true; return nil }

// ---- 响应阶段 ----

type statusAction struct{ raw string }

func (a *statusAction) Kind() string      { return "statusCode" }
func (a *statusAction) Phase() flow.Phase { return flow.PhaseResponse }
func (a *statusAction) Apply(ctx *flow.Context) error {
	// TODO: 解析状态码；若 ctx.Resp 为空（上游失败）则构造空响应
	return nil
}

type throttleAction struct{ raw string }

func (a *throttleAction) Kind() string      { return "throttle" }
func (a *throttleAction) Phase() flow.Phase { return flow.PhaseResponse }
func (a *throttleAction) Apply(ctx *flow.Context) error {
	// TODO: 解析 "50kb" → ctx.ThrottleBytes；ctx.Session.Throttled = true
	return nil
}

type corsAction struct{}

func (a *corsAction) Kind() string      { return "cors" }
func (a *corsAction) Phase() flow.Phase { return flow.PhaseResponse }
func (a *corsAction) Apply(ctx *flow.Context) error {
	// TODO: OPTIONS 预检直接 204；其余补齐 Access-Control-Allow-* 头（Origin 回显以兼容 credentials）
	return nil
}
