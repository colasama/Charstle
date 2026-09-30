package api

import (
	"net/http"
)

// routes 注册全部接口。未实现的统一返回 501，按里程碑逐个补齐。
func (s *Server) routes() {
	m := s.mux
	todo := http.HandlerFunc(notImplemented)

	// ---- 事件流（M1）----
	m.Handle("GET /api/events", todo) // WebSocket，见 events.Bus

	// ---- 会话（M1 / M4）----
	m.HandleFunc("GET /api/sessions", s.listSessions)
	m.Handle("GET /api/sessions/{id}", todo)
	m.Handle("GET /api/sessions/{id}/body/{kind}", todo) // kind=req|res，?decode=1
	m.Handle("GET /api/sessions/{id}/frames", todo)      // WebSocket 帧
	m.Handle("GET /api/sessions/{id}/curl", todo)
	m.Handle("POST /api/sessions/{id}/replay", todo)
	m.HandleFunc("DELETE /api/sessions", s.clearSessions)
	m.Handle("GET /api/har", todo)  // ?ids=1,2,3
	m.Handle("POST /api/har", todo) // 导入
	m.Handle("PUT /api/recording", todo)

	// ---- 规则 / Values / 脚本（M3 / M4）----
	m.HandleFunc("GET /api/rules", s.listRuleGroups)
	m.Handle("POST /api/rules", todo)
	m.Handle("PUT /api/rules/{id}", todo)
	m.Handle("DELETE /api/rules/{id}", todo)
	m.Handle("PUT /api/rules/order", todo)
	m.Handle("POST /api/rules/validate", todo)

	m.Handle("GET /api/values", todo)
	m.Handle("PUT /api/values/{key}", todo)
	m.Handle("DELETE /api/values/{key}", todo)

	m.Handle("GET /api/scripts", todo)
	m.Handle("PUT /api/scripts/{name}", todo)
	m.Handle("DELETE /api/scripts/{name}", todo)
	m.Handle("POST /api/scripts/{name}/run", todo)

	// ---- 断点 / Compose / 限速（M4 / M5）----
	m.Handle("GET /api/breakpoints", todo)
	m.Handle("PUT /api/breakpoints", todo)
	m.Handle("POST /api/breakpoints/paused/{id}", todo) // body: pipeline.Resolution
	m.Handle("POST /api/compose", todo)
	m.Handle("GET /api/throttle", todo)
	m.Handle("PUT /api/throttle", todo)

	// ---- 设备 / 局域网（M1）----
	m.Handle("GET /api/lan", todo)
	m.Handle("GET /api/devices", todo)
	m.Handle("PUT /api/devices/{ip}", todo) // { status, remember, name }
	m.Handle("GET /api/access", todo)
	m.Handle("PUT /api/access", todo)

	// ---- 证书 / SSL（M2 / M5）----
	m.Handle("GET /api/ca", todo)
	m.Handle("GET /api/ca/charstle-ca.crt", todo)
	m.Handle("GET /api/ca/charstle-ca.pem", todo)
	m.Handle("GET /api/ca/charstle.mobileconfig", todo)
	m.Handle("POST /api/ca/install", todo)
	m.Handle("POST /api/ca/regenerate", todo)
	m.Handle("GET /api/ssl-proxying", todo)
	m.Handle("PUT /api/ssl-proxying", todo)
	m.Handle("GET /api/pinned", todo)
	m.Handle("DELETE /api/pinned", todo)

	// ---- 设置 / 系统代理（M1 / M5）----
	m.Handle("GET /api/settings", todo)
	m.Handle("PUT /api/settings", todo)
	m.Handle("PUT /api/system-proxy", todo)
}

// ---- 已接线的几个示例 handler ----

func (s *Server) listSessions(w http.ResponseWriter, r *http.Request) {
	// TODO: 解析 keyword / offset / limit
	writeJSON(w, http.StatusOK, s.d.Store.List(storeQuery(r)))
}

func (s *Server) clearSessions(w http.ResponseWriter, r *http.Request) {
	s.d.Store.Clear()
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listRuleGroups(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.d.Rules.Groups())
}
