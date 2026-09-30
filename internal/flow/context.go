// Package flow 定义一次请求在管道中流转时的上下文。
// 独立成包是为了让 rules（动作实现）和 pipeline（调度）都能引用而不产生循环依赖。
package flow

import (
	"net/http"
	"net/url"
	"time"

	"charstle/internal/store"
)

type Phase int

const (
	PhaseRequest  Phase = iota // 收到请求后、发往上游前
	PhaseDial                  // 建立上游连接时（host 规则）
	PhaseResponse              // 收到上游响应后、回写客户端前
)

func (p Phase) String() string {
	switch p {
	case PhaseRequest:
		return "request"
	case PhaseDial:
		return "dial"
	default:
		return "response"
	}
}

// ConnInfo 描述请求来自哪条客户端连接，由 proxy 传给 pipeline。
type ConnInfo struct {
	ClientIP string
	Scheme   string         // http | https（MITM 解密后）
	TLS      *store.TLSInfo // 客户端侧 TLS 信息，明文时为 nil
}

type Context struct {
	Session  *store.Session
	ClientIP string

	// 原始请求（可被请求阶段动作修改）
	Req *http.Request
	// 实际发往上游的目标；mapRemote 会改写它
	Target *url.URL
	// host 规则设置的拨号地址（ip:port），为空则正常 DNS 解析
	DialAddr string

	// 响应：上游返回的，或由 mock / file 动作直接生成的
	Resp *http.Response
	// true 表示响应由本地生成，跳过上游
	ShortCircuit bool
	// 断开连接（block://）
	Abort bool

	// 请求前延迟、响应限速
	Delay         time.Duration
	ThrottleBytes int64 // bytes/s，0 = 不限

	// 当前匹配规则的正则分组（$1、$2…）
	Match       []string
	Pattern     string
	PatternKind string
}

// Hit 记录命中的规则，展示在会话详情「规则」页签。
func (c *Context) Hit(h store.RuleHit) {
	c.Session.Hits = append(c.Session.Hits, h)
}
