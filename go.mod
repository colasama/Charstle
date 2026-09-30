module charstle

go 1.25

// 前端依赖目录不参与 Go 包扫描
ignore ./web/node_modules

// 计划引入的依赖（按里程碑）：
//   M2  golang.org/x/net/http2               HTTP/2（客户端侧 h2 服务 + 上游 h2）
//   M2  github.com/andybalholm/brotli        br 解码
//   M2  github.com/klauspost/compress/zstd   zstd 解码
//   M3  modernc.org/sqlite                   规则 / Values / 设备持久化（纯 Go，免 CGO）
//   M4  github.com/dop251/goja               JS Mock 脚本
//   M4  github.com/coder/websocket           Admin 事件流 + WebSocket 帧捕获
