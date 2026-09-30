package proxy

import (
	"bufio"
	"io"
	"net"
	"net/http"
	"sync"
)

type connKind int

const (
	kindTLS   connKind = iota // 首字节 0x16：TLS ClientHello
	kindHTTP                  // 明文 HTTP（如 ws:// 经代理）
	kindOther                 // 其他 TCP 协议
)

// handleConnect 处理 CONNECT host:port。
//
//	回复 200 → Peek 首字节判断协议：
//	  TLS  且需要解密 → MITM：tls.Server(conn, certs.ServerTLSConfig(host)) → 按 ALPN 走 h2 或 http/1.1
//	  TLS  且不解密   → 盲隧道（记录一条 tunnel 会话，只统计字节数）
//	  明文 HTTP       → 按普通请求处理（scheme=http）
//	  其他            → 盲隧道
func (s *Server) handleConnect(conn net.Conn, br *bufio.Reader, req *http.Request, clientIP string) {
	if _, err := io.WriteString(conn, "HTTP/1.1 200 Connection Established\r\n\r\n"); err != nil {
		return
	}
	kind, err := sniff(br)
	if err != nil {
		return
	}
	host := req.URL.Host

	switch {
	case kind == kindTLS && s.shouldIntercept(host):
		s.serveMITM(conn, br, host, clientIP)
	case kind == kindHTTP:
		// TODO: 与 serveConn 相同的请求循环，scheme=http
	default:
		s.tunnel(conn, br, host, clientIP)
	}
}

// sniff 窥探隧道内第一个字节，不消费数据。
func sniff(br *bufio.Reader) (connKind, error) {
	b, err := br.Peek(1)
	if err != nil {
		return kindOther, err
	}
	switch {
	case b[0] == 0x16:
		return kindTLS, nil
	case b[0] >= 'A' && b[0] <= 'Z': // GET / POST / …
		return kindHTTP, nil
	}
	return kindOther, nil
}

// shouldIntercept 综合 SSL Proxying 开关、include/exclude 列表、证书固定降级。
func (s *Server) shouldIntercept(host string) bool {
	if !s.opt.Config.SSL.Enabled || s.opt.Pins.ShouldBypass(host) {
		return false
	}
	// TODO: include / exclude 通配匹配
	return true
}

// serveMITM 终结客户端 TLS 并把解密后的请求交给 Handler。
func (s *Server) serveMITM(conn net.Conn, br *bufio.Reader, host, clientIP string) {
	// TODO:
	//   c := &peekedConn{Conn: conn, r: br}
	//   tlsConn := tls.Server(c, s.opt.Certs.ServerTLSConfig(hostname, cfg.Protocol.HTTP2))
	//   握手失败 → s.opt.Pins.RecordFailure(host, err.Error(), clientIP)
	//   ALPN == "h2" → http2.Server.ServeConn(tlsConn, handler)
	//   否则          → HTTP/1.1 请求循环
	//   ConnInfo{ClientIP, Scheme: "https", TLS: &store.TLSInfo{Intercepted: true, …}}
}

// tunnel 盲转发：双向拷贝，不解密。
func (s *Server) tunnel(conn net.Conn, br *bufio.Reader, host, clientIP string) {
	upstream, err := net.Dial("tcp", host) // TODO: 走上游代理 / 自定义 DNS
	if err != nil {
		return
	}
	defer upstream.Close()
	// TODO: 若 cfg.Capture.RecordTunnels，记录一条 state=tunnel 的会话并统计字节数

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		io.Copy(upstream, br) // br 中可能已有 Peek 过的数据
		if tc, ok := upstream.(*net.TCPConn); ok {
			tc.CloseWrite()
		}
	}()
	go func() {
		defer wg.Done()
		io.Copy(conn, upstream)
		if tc, ok := conn.(*net.TCPConn); ok {
			tc.CloseWrite()
		}
	}()
	wg.Wait()
}
