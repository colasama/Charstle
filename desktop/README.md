# 桌面壳

桌面壳使用 Wails v2，复用 internal/app 的同一代理核心和内嵌前端。独立 Go module 避免 CLI 依赖桌面库。

## Windows 构建

先在根目录构建前端，然后：

```powershell
npm --prefix web ci
npm --prefix web run build
cd desktop
go mod download
go build -tags production -ldflags "-H=windowsgui" -o ../bin/charstle-desktop.exe .
```

完整打包可安装 Wails v2 CLI 后在此目录执行 wails build。Windows 需要 WebView2 Runtime；Linux/macOS 的原生构建依赖见 Wails 官方文档。

界面使用本机管理服务的 iframe，共享原有认证和 WebSocket。窗口和浏览器的数据一致；CLI 与桌面版默认共用用户目录 .charstle，因此不能同时占用默认端口。可通过 CHARSTLE_DATA_DIR 环境变量隔离桌面数据和配置。

## 系统交互

- 原生应用菜单：显示窗口、录制开关、系统代理开关、退出。
- Windows/Linux 托盘：相同控制项；关闭应用时停止服务并恢复本次启用前的系统代理。
- macOS 使用原生应用菜单。Wails 与另一个托盘库的 Objective-C 主事件循环存在组合风险，当前不启用该托盘实现。
- 托盘图标由代码生成，不依赖外部资源。

Windows 构建已验证；原生窗口、托盘、系统代理切换和不同平台 WebView 的实际交互需发行前实机验收。核心浏览器界面和后端测试不等同于桌面端验收。
