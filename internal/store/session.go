// Package store 保存抓到的会话。字段与前端 types/session.ts 对应。
package store

import (
	"net/http"
	"time"
)

type State string

const (
	StatePending State = "pending"
	StateDone    State = "done"
	StateError   State = "error"
	StateTunnel  State = "tunnel"  // 未解密的 CONNECT 隧道
	StatePaused  State = "paused"  // 命中断点
	StateAborted State = "aborted" // 被 block 或在断点处中止
)

type Timing struct {
	Start    time.Time `json:"start"`
	DNSStart time.Time `json:"dnsStart,omitzero"`
	DNSDone  time.Time `json:"dnsDone,omitzero"`
	Connect  time.Time `json:"connect,omitzero"`
	TLSDone  time.Time `json:"tlsDone,omitzero"`
	WroteReq time.Time `json:"wroteReq,omitzero"`
	TTFB     time.Time `json:"ttfb,omitzero"`
	End      time.Time `json:"end,omitzero"`
}

type TLSInfo struct {
	Version     string `json:"version"`
	Cipher      string `json:"cipher"`
	SNI         string `json:"sni"`
	ALPN        string `json:"alpn"`
	Intercepted bool   `json:"intercepted"`
}

type RuleHit struct {
	RuleID  string `json:"ruleId"`
	Group   string `json:"group"`
	Line    int    `json:"line"`
	Pattern string `json:"pattern"`
	Action  string `json:"action"`
	Value   string `json:"value"`
	Phase   string `json:"phase"`
}

type WsFrame struct {
	ID     int       `json:"id"`
	Dir    string    `json:"dir"` // out | in
	Opcode string    `json:"opcode"`
	Size   int       `json:"size"`
	Time   time.Time `json:"time"`
	Data   BodyRef   `json:"-"`
}

type Session struct {
	ID       uint64 `json:"id"`
	ClientIP string `json:"clientIp"`

	Method    string      `json:"method"`
	Scheme    string      `json:"scheme"`
	Host      string      `json:"host"`
	Path      string      `json:"path"`
	URL       string      `json:"url"`
	Proto     string      `json:"proto"`
	FinalURL  string      `json:"finalUrl,omitempty"` // 被 host / mapRemote 改写后的实际目标
	Remote    string      `json:"remoteAddr,omitempty"`
	ReqHeader http.Header `json:"-"`
	ReqBody   BodyRef     `json:"-"`

	Status     int         `json:"status,omitempty"`
	StatusText string      `json:"statusText,omitempty"`
	RespHeader http.Header `json:"-"`
	RespBody   BodyRef     `json:"-"`

	ReqSize  int64 `json:"reqSize"`
	RespSize int64 `json:"resSize"`

	State     State     `json:"state"`
	Mocked    bool      `json:"mocked,omitempty"`
	Remapped  bool      `json:"remapped,omitempty"`
	Throttled bool      `json:"throttled,omitempty"`
	Hits      []RuleHit `json:"ruleHits,omitempty"`
	TLS       *TLSInfo  `json:"tls,omitempty"`
	Frames    []WsFrame `json:"-"`
	Timing    Timing    `json:"timing"`
	Error     string    `json:"error,omitempty"`
}

// Summary 是推送给列表的精简结构（对应前端 SessionSummary）。
type Summary struct {
	ID        uint64 `json:"id"`
	ClientIP  string `json:"clientIp"`
	Method    string `json:"method"`
	Scheme    string `json:"scheme"`
	Host      string `json:"host"`
	Path      string `json:"path"`
	Proto     string `json:"proto"`
	Status    int    `json:"status,omitempty"`
	Type      string `json:"type"`
	Mime      string `json:"mime,omitempty"`
	ReqSize   int64  `json:"reqSize"`
	ResSize   int64  `json:"resSize"`
	StartedAt int64  `json:"startedAt"`
	Duration  int64  `json:"duration,omitempty"`
	State     State  `json:"state"`
	Hits      int    `json:"hits"`
	Mocked    bool   `json:"mocked,omitempty"`
	Remapped  bool   `json:"remapped,omitempty"`
	Throttled bool   `json:"throttled,omitempty"`
}

func (s *Session) Summary() Summary {
	// TODO: Type 由 Content-Type / 扩展名 / Upgrade 头推断（xhr、doc、js、css、img、media、font、ws、other）
	sum := Summary{
		ID:        s.ID,
		ClientIP:  s.ClientIP,
		Method:    s.Method,
		Scheme:    s.Scheme,
		Host:      s.Host,
		Path:      s.Path,
		Proto:     s.Proto,
		Status:    s.Status,
		Type:      "other",
		ReqSize:   s.ReqSize,
		ResSize:   s.RespSize,
		StartedAt: s.Timing.Start.UnixMilli(),
		State:     s.State,
		Hits:      len(s.Hits),
		Mocked:    s.Mocked,
		Remapped:  s.Remapped,
		Throttled: s.Throttled,
	}
	if !s.Timing.End.IsZero() {
		sum.Duration = s.Timing.End.Sub(s.Timing.Start).Milliseconds()
	}
	return sum
}
