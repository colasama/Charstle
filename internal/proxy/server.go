// Package proxy 实现代理监听：普通 HTTP 代理请求、CONNECT 隧道、TLS 终结（MITM）。
package proxy

import (
	"bufio"
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"

	"charstle/internal/config"
	"charstle/internal/flow"
	"charstle/internal/mitm"
	"charstle/internal/store"
)

// Handler 处理一个完整的 HTTP 请求（pipeline.Pipeline 实现它）。
type Handler interface {
	HandleRequest(w http.ResponseWriter, r *http.Request, info flow.ConnInfo)
}

type Options struct {
	Config  *config.Config
	Handler Handler
	Access  *AccessControl
	Certs   *mitm.LeafCache
	Pins    *mitm.PinTracker
	Store   *store.Store
	Log     *slog.Logger
	// Builtin 处理发给代理自身的请求（charstle.pro、/ssl 证书下载页、/proxy.pac）
	Builtin http.Handler
}

type Server struct {
	opt Options
	ln  net.Listener
}

func NewServer(opt Options) *Server {
	return &Server{opt: opt}
}

func (s *Server) ListenAndServe(ctx context.Context) error {
	ln, err := net.Listen("tcp", s.opt.Config.ProxyAddr())
	if err != nil {
		return err
	}
	s.ln = ln
	go func() {
		<-ctx.Done()
		ln.Close()
	}()

	for {
		conn, err := ln.Accept()
		if err != nil {
			if errors.Is(err, net.ErrClosed) {
				return nil
			}
			s.opt.Log.Warn("accept", "err", err)
			continue
		}
		go s.serveConn(conn)
	}
}

// serveConn 处理一条客户端连接。
func (s *Server) serveConn(conn net.Conn) {
	defer conn.Close()
	clientIP := remoteIP(conn)

	// 1. 访问控制：新设备按模式放行 / 等待 UI 确认 / 拒绝
	if !s.opt.Access.Allow(clientIP) {
		return
	}

	br := bufio.NewReader(conn)
	// 2. 同一连接上循环读取请求（keep-alive）
	for {
		req, err := http.ReadRequest(br)
		if err != nil {
			return
		}
		if req.Method == http.MethodConnect {
			s.handleConnect(conn, br, req, clientIP)
			return // CONNECT 之后连接归隧道 / MITM 所有
		}
		if s.isSelf(req) {
			// TODO: 用 conn 包装的 ResponseWriter 调用 s.opt.Builtin
			return
		}
		// TODO: 包装成 http.ResponseWriter（写回 conn），调用 s.opt.Handler.HandleRequest(
		//       w, req, flow.ConnInfo{ClientIP: clientIP, Scheme: "http"})；
		//       根据 Connection 头决定是否继续循环
		return
	}
}

// isSelf 判断请求是否发往代理自身（防回环 + 内置页面）。
func (s *Server) isSelf(req *http.Request) bool {
	// TODO: Host 为 charstle.pro，或等于本机任一地址 + 代理端口
	return false
}

func remoteIP(c net.Conn) string {
	host, _, err := net.SplitHostPort(c.RemoteAddr().String())
	if err != nil {
		return c.RemoteAddr().String()
	}
	return host
}
