# 桌面壳（M5）

用 [Wails v2](https://wails.io) 把 Web UI 包成桌面应用，提供托盘图标和一键开关系统代理。
它是独立的 Go module，核心模块不依赖 Wails。

## 启用

```bash
cd desktop
go mod edit -require charstle@v0.0.0 -replace charstle=../
go get github.com/wailsapp/wails/v2@latest
# 前端产物：复制或软链 ../web/dist 为 ./frontend
wails build -tags wails
```

## 待办

- [ ] 把 `cmd/charstle/main.go` 的组装逻辑抽成 `internal/app.Run(ctx, dataDir)`，桌面端和命令行共用
- [ ] 托盘菜单：录制开关、系统代理开关、打开主窗口、退出
- [ ] 退出时调用 `sysproxy.Restore`
