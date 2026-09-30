package pipeline

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"time"

	"charstle/internal/config"
	"charstle/internal/flow"
)

func errNotImplemented(what string) error {
	return fmt.Errorf("%s: not implemented", what)
}

type dialAddrKey struct{}

// Transport 负责与上游通信：上游代理链、自定义 DNS、host 规则的拨号地址覆盖。
type Transport struct {
	cfg config.Upstream
	rt  *http.Transport
}

func NewTransport(cfg config.Upstream) *Transport {
	d := &net.Dialer{Timeout: 15 * time.Second, KeepAlive: 30 * time.Second}
	t := &Transport{cfg: cfg}
	t.rt = &http.Transport{
		// 注意：连接池的 key 必须是实际拨号地址。host 规则改写时通过 context 传入 DialAddr，
		// 这里拨到覆盖地址；由于 http.Transport 按 URL host 做连接池 key，
		// 需要为「原 host + 覆盖地址」组合区分连接（TODO：改用自定义 key 或按覆盖地址分池）。
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			if override, ok := ctx.Value(dialAddrKey{}).(string); ok && override != "" {
				addr = override
			}
			// TODO: 自定义 DNS / hosts 文件 / 上游 socks5
			return d.DialContext(ctx, network, addr)
		},
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: cfg.InsecureTLS},
		ForceAttemptHTTP2:   true,
		MaxIdleConnsPerHost: 16,
		IdleConnTimeout:     90 * time.Second,
		// 不自动解压：原样转发字节，展示时再解码
		DisableCompression: true,
		// TODO: Proxy: 上游 HTTP 代理 + Bypass 列表
	}
	return t
}

// RoundTrip 发送 ctx.Req 到 ctx.Target，结果写入 ctx.Resp，并记录 DNS/连接/TLS/TTFB 时间点（httptrace）。
func (t *Transport) RoundTrip(ctx *flow.Context) error {
	// TODO:
	//   out := ctx.Req.Clone(context.WithValue(ctx.Req.Context(), dialAddrKey{}, ctx.DialAddr))
	//   out.URL = ctx.Target；out.RequestURI = ""；去掉 hop-by-hop 头（Proxy-Connection 等）
	//   httptrace.WithClientTrace → 填 ctx.Session.Timing
	//   resp, err := t.rt.RoundTrip(out)
	return errNotImplemented("Transport.RoundTrip")
}
