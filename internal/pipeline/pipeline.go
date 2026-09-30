// Package pipeline 处理每一个（明文或已解密的）HTTP 请求：
//
//	创建会话 → 规则(请求阶段) → 断点(请求) → 延迟 → 上游往返 / 本地响应
//	→ 规则(响应阶段) → 断点(响应) → 限速 → 流式回写 + 捕获 body
package pipeline

import (
	"net/http"
	"time"

	"charstle/internal/config"
	"charstle/internal/events"
	"charstle/internal/flow"
	"charstle/internal/rules"
	"charstle/internal/store"
)

type Options struct {
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
	return &Pipeline{opt: opt, transport: NewTransport(opt.Upstream)}
}

func (p *Pipeline) Breakpoints() *Breakpoints { return p.opt.Breakpoints }
func (p *Pipeline) Throttler() *Throttler     { return p.opt.Throttle }

// HandleRequest 由 proxy 在读到一个完整请求头后调用。
// w 写回客户端；对 HTTP/1.1 与 HTTP/2 统一走这个入口。
func (p *Pipeline) HandleRequest(w http.ResponseWriter, r *http.Request, info flow.ConnInfo) {
	sess := p.opt.Store.NewSession()
	sess.ClientIP = info.ClientIP
	sess.Method = r.Method
	sess.Scheme = info.Scheme
	sess.Host = r.Host
	sess.Path = r.URL.RequestURI()
	sess.Proto = r.Proto
	sess.ReqHeader = r.Header.Clone()
	sess.TLS = info.TLS
	sess.Timing.Start = time.Now()

	ctx := &flow.Context{
		Session:  sess,
		ClientIP: info.ClientIP,
		Req:      r,
		Target:   r.URL, // TODO: 补全 scheme/host（代理收到的 URL 可能是相对路径）
	}
	sess.URL = ctx.Target.String()
	p.opt.Store.Add(sess)

	// TODO: 按以下顺序实现
	//   1. p.opt.Rules.Apply(ctx, flow.PhaseRequest)；ctx.Abort → 断开连接，State=aborted
	//   2. p.opt.Breakpoints.Pause(ctx, flow.PhaseRequest)（若命中，阻塞直到 UI 处理或超时）
	//   3. ctx.Delay > 0 → time.Sleep（需响应 r.Context().Done()）
	//   4. !ctx.ShortCircuit → p.opt.Rules.Apply(ctx, flow.PhaseDial)；p.transport.RoundTrip(ctx)
	//   5. p.opt.Rules.Apply(ctx, flow.PhaseResponse)
	//   6. p.opt.Breakpoints.Pause(ctx, flow.PhaseResponse)
	//   7. 回写：复制响应头；body 用 store.NewCapture 包装 + 限速 writer；支持 Flush（SSE）
	//   8. Upgrade: websocket → 交给 websocket 帧捕获
	//   9. 更新 Timing / Status / State，p.opt.Store.Update(sess)
	http.Error(w, "charstle: pipeline not implemented", http.StatusNotImplemented)
	sess.State = store.StateError
	sess.Error = "pipeline not implemented"
	sess.Timing.End = time.Now()
	p.opt.Store.Update(sess)
}

// Replay 重新发送一个已抓到的会话（经过规则引擎）。
func (p *Pipeline) Replay(id uint64) (*store.Session, error) {
	// TODO
	return nil, errNotImplemented("Replay")
}

// ComposeRequest 来自「请求构造」页面的手工请求。
type ComposeRequest struct {
	Method          string      `json:"method"`
	URL             string      `json:"url"`
	Header          http.Header `json:"headers"`
	Body            string      `json:"body"`
	ViaRules        bool        `json:"viaRules"`
	FollowRedirects bool        `json:"followRedirects"`
	TimeoutMs       int         `json:"timeoutMs"`
}

func (p *Pipeline) Compose(req ComposeRequest) (*store.Session, error) {
	// TODO
	return nil, errNotImplemented("Compose")
}
