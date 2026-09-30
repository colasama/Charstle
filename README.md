# Charstle

类似 whistle + Charles 的抓包调试工具：HTTP/HTTPS 抓包、局域网设备接入、规则改写（host / Map Remote / Map Local）、Mock、断点、限速。

> 当前状态：**前端界面已完成（使用 mock 数据），后端为可编译的骨架**，具体逻辑以 `TODO` 标注。

## 目录结构

```
cmd/charstle/          入口：组装各模块、启动代理端口(8888)与管理端口(8899)
internal/
  config/              配置项（与 web/src/types/settings.ts 对应）
  proxy/               监听、CONNECT、协议嗅探、盲隧道、MITM 入口、访问控制、局域网地址
  mitm/                根证书、叶子证书缓存、证书固定降级
  flow/                单个请求的上下文（rules 与 pipeline 共用，避免循环依赖）
  pipeline/            请求管道：规则 → 断点 → 上游 → 规则 → 断点 → 限速 → 回写；Transport、Compose
  rules/               规则解析、匹配（域名 trie + 正则）、动作实现、Values
  mock/                Map Local、内联响应、JS 脚本（goja）
  store/               会话环形缓冲、body 捕获与落盘、HAR
  events/              事件总线（→ WebSocket 推送 UI）
  api/                 管理 REST 接口（routes.go 为完整路由表）、证书下载页（代理端口上）
  sysproxy/            系统代理开关（Windows / macOS）
web/                   React + Vite 前端；构建产物通过 go:embed 打包
desktop/               Wails 桌面壳（独立 module，M5）
```

## 开发

```bash
# 前端（开发时 /api 代理到 127.0.0.1:8899）
cd web
npm install
npm run dev          # http://localhost:5173

# 后端（需要 Go 1.25+；先构建一次前端，产物会嵌入二进制）
cd web && npm run build && cd ..
go run ./cmd/charstle
# 管理界面 http://127.0.0.1:8899   代理 0.0.0.0:8888
```

## 前端说明

| 页面 | 路由 | 里程碑 | 文件 |
|---|---|---|---|
| 抓包 | `#/network` | M1 | `pages/NetworkPage.tsx`、`components/network/*` |
| 规则 | `#/rules` | M3 | `pages/RulesPage.tsx`、`components/rules/*` |
| Values | `#/values` | M3 | `pages/ValuesPage.tsx` |
| Mock 脚本 | `#/scripts` | M4 | `pages/ScriptsPage.tsx` |
| 断点 | `#/breakpoints` | M5 | `pages/BreakpointsPage.tsx`、`modals/BreakpointEditorModal.tsx` |
| 请求构造 | `#/compose` | M4 | `pages/ComposePage.tsx` |
| 限速 | `#/throttle` | M5 | `pages/ThrottlePage.tsx` |
| 设备 | `#/devices` | M1 | `pages/DevicesPage.tsx`、`modals/DeviceApprovalModal.tsx` |
| 证书 | `#/ssl` | M2 | `pages/CertificatePage.tsx` |
| 设置 | `#/settings` | M1 | `pages/SettingsPage.tsx` |

- **数据**：页面目前读取 `src/mock/`。搜索 `TODO(api)` 可以找到所有需要替换为真实接口的位置；接口签名在 `src/api/client.ts`，事件流在 `src/api/events.ts`。
- **UI 状态**：`src/store/ui.ts`（主题、选中项、弹窗、全局开关的显示状态）。业务数据建议另建 store。
- **样式**：设计 token 在 `src/styles/tokens.css`（浅色 / 深色），通用组件样式在 `src/styles/components.css`，页面样式在 `src/pages/pages.css`。
- **规则编辑器**：CodeMirror 6，语法高亮见 `components/common/ruleLanguage.ts`。

## 后端填充顺序建议

1. **M1**：`proxy/server.go` 请求循环 + ResponseWriter → `pipeline.HandleRequest` → `pipeline/transport.go RoundTrip` → `store.Capture` → `events.Bus` 批量推送 → `api` 的 `/api/events` WebSocket
2. **M2**：`mitm/ca.go` 生成 CA → `mitm/leaf.go` 签发 → `proxy/connect.go serveMITM` → `api/certpage.go`
3. **M3**：`rules/parser.go` → `rules/matcher.go` → `rules/engine.go Apply` → `rules/actions.go`
4. **M4**：HTTP/2（`golang.org/x/net/http2`）、WebSocket 帧、`mock.Runner`（goja）、Replay / Compose、HAR
5. **M5**：断点、限速、证书固定降级、`sysproxy`、桌面壳
