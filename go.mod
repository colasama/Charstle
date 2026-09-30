module charstle

go 1.26.0

// 前端依赖目录不参与 Go 包扫描
ignore ./web/node_modules

require (
	github.com/andybalholm/brotli v1.2.6
	github.com/coder/websocket v1.8.15
	github.com/dop251/goja v0.0.0-20260926152631-39ec2650adc9
	github.com/klauspost/compress v1.20.1
	golang.org/x/net v0.59.0
	golang.org/x/sys v0.48.0
)

require (
	github.com/dlclark/regexp2/v2 v2.5.2 // indirect
	github.com/go-sourcemap/sourcemap v2.1.3+incompatible // indirect
	github.com/google/pprof v0.0.0-20230207041349-798e818bf904 // indirect
	golang.org/x/text v0.42.0 // indirect
)
