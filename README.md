# Charstle

本地 HTTP/HTTPS 抓包与调试工具。Go 代理核心内嵌 React 管理界面，支持局域网设备、规则改写、Mock、请求重放、断点和限速。

## 运行

独立可执行文件不依赖 Node.js 或 Go。Windows 下载构建产物后运行：

```powershell
.\charstle-0.1.0-win32-x64.exe
# 自定义端口和数据目录
.\charstle-0.1.0-win32-x64.exe --proxy-port 8888 --admin-port 8899 --data-dir E:\charstle-data --no-open
```

管理界面默认为 http://127.0.0.1:8899，HTTP 代理端口为 8888。默认自动打开浏览器；Ctrl+C 正常退出。数据默认保存在用户目录的 .charstle 中，与启动位置无关。

1. 在浏览器/系统中设置 HTTP 和 HTTPS 代理为本机 127.0.0.1:8888，或使用工具栏的系统代理开关。
2. 如需解密 HTTPS，在「证书」页安装并信任当前实例的根证书。
3. 手机使用「设备」页显示的局域网地址，在管理界面允许设备接入，然后访问 http://charstle.pro 安装证书。iOS 还需开启完全信任。
4. 「规则」「Values」「脚本」中的保存操作即时生效；设置页标注的监听、上游和捕获配置需要重启。

管理端默认仅监听回环地址。开启局域网管理必须设置密码，HTTP Basic 登录的用户名可任意填写。默认设备策略为询问，本机回环访问直接允许。

## 已实现

| 范围 | 能力 |
| --- | --- |
| 代理与捕获 | HTTP/1.1、HTTPS CONNECT/MITM、HTTP/2、SSE 流式转发、非 HTTP 盲隧道、WebSocket 帧、会话搜索与过滤 |
| 证书 | 每实例根 CA、动态叶证书缓存、CRT/PEM/iOS 描述文件、解密包含/排除规则、客户端拒绝证书后的隧道降级 |
| 规则 | 域名/通配符/URL 前缀/正则匹配、方法/设备 IP/状态过滤、规则组排序、编辑器与表格、错误诊断和命中定位 |
| 动作 | host、Map Remote、Map Local、Mock、JS 脚本、请求/响应头与 body、状态码、延时、限速、阻断、CORS |
| 调试 | Compose、重放、301/302/303/307/308 重定向、HAR 导入/导出、cURL 复制、请求/响应断点编辑 |
| 管理 | WebSocket 实时事件、设备审批/IP 与 CIDR 列表、设备名称持久化、JSON 原子保存、上游代理、自定义 DNS |
| 系统集成 | Windows/macOS/GNOME 系统代理保存和恢复；独立 Wails 桌面壳与 Windows/Linux 托盘 |
| 分发 | 六个平台原生 CLI 构建、npm 启动器、CI 检查和手动 release 产物工作流 |

## 规则示例

在 Values 新建 JSON 类型的 hello，内容为 {"ok":true}，再添加规则：

```text
api.example.com mock://{hello}
api.example.com/v1/ https://staging.example.com/v1/
api.example.com host://127.0.0.1:8080
static.example.com file://"E:\fixtures\static files"
api.example.com reqHeaders://{headers} method=POST
api.example.com resBody://{hello} status=500
api.example.com delay://300 throttle://50kb
ads.example.com block://
api.example.com cors://
api.example.com script://demo.js
```

规则按组顺序、行顺序处理；同一阶段同类动作只采用第一条匹配项。# 开头为注释，带空格的参数使用引号。请求阶段无法匹配尚未产生的响应状态。

脚本导出同步函数；返回 null/undefined 继续请求上游：

```javascript
exports.handle = function (req, ctx) {
  console.log(req.method, req.path);
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { message: "hello", query: req.query, device: ctx.clientIp },
    delay: 100
  };
};
```

脚本运行于独立 goja 环境，无 require、文件系统、网络和 Node.js API；默认运行上限 1 秒、请求体上限 8 MiB。支持 req.method/url/path/query/headers/body/json、ctx.match/clientIp/values。

## npx 与发布

发布到 npm 后，用户可以使用：

```sh
npx --yes charstle@latest
# 或全局安装
npm install -g charstle
charstle --no-open
```

**当前仓库提供发布构建与启动器，不代表包已经发布。** npm 方案由小型 JS 入口和六个按操作系统/架构选择的原生可选依赖组成，安装阶段不编译 Go、不运行下载脚本。支持 Windows/macOS/Linux 的 x64 和 ARM64。

完整构建、包名、发布顺序、验证方法和其他分发形式见 [分发文档](docs/DISTRIBUTION.md)。

## 开发与检查

需要 Go 1.26+、Node.js 22+。前端必须先构建，因为 Go 使用 go:embed 嵌入 web/dist：

```sh
npm --prefix web ci
npm --prefix web run build
go run ./cmd/charstle --no-open
# 另一个终端，开发界面默认 5173，API 与 WebSocket 转发到 8899
npm --prefix web run dev

go test ./...
go test -race ./...
go vet ./...
npm run test:launcher
node scripts/package.mjs all
```

竞态检测需要当前平台的 C 编译器。普通 CLI 构建为 CGO_ENABLED=0。可设置 GO 环境变量指定 go 可执行文件。

桌面壳见 [desktop/README.md](desktop/README.md)。核心 Go module 不依赖桌面运行库。

## 数据与边界

- 配置、规则、Values/脚本、设备名称、断点规则、限速配置和 CA 保存在数据目录。会话是进程内数据；长期保存请导出 HAR。大 body 会临时落盘，正常清空或退出时删除。
- 默认最多 10,000 个会话，每方向捕获前 10 MiB；捕获截断不截断实际转发。内存限制控制存储快照，不是进程总 RSS 的硬上限。body 解压读取最多 32 MiB，界面文本预览最多 2 MiB。
- WebSocket 帧预览保留最近 1,000 帧，每帧最多 64 KiB；启用帧捕获时不协商压缩。分片按原始帧展示，二进制帧显示 Base64。
- HTTP/2 支持普通请求和流式响应；HTTP/3/QUIC 和 HTTP/2 扩展 CONNECT WebSocket 不在当前支持范围。证书固定的应用会透传，无法强行解密。
- 限速的“失败概率”模拟整次请求失败，不是 TCP 层丢包。
- 断点预览最多 1 MiB，截断内容可继续或中止，不能覆盖为不完整的 body。响应内容改写会替换原响应流。
- HAR 使用标准响应 Base64，二进制请求通过 _encoding 扩展保真；其他 HAR 工具可能忽略此扩展。cURL 文本采用 POSIX shell 引号。
- 系统代理在正常退出时恢复。强制终止、断电无法执行退出清理；可在操作系统网络设置中手动恢复。Linux 自动代理限 GNOME，其他桌面环境手动配置。
- macOS 桌面壳使用原生应用菜单；未组合可能冲突的两套 macOS 托盘事件循环。桌面安装包签名、公证及各平台实机验收仍属于发行工作。
- 仓库尚未指定开源许可证，npm 元数据使用 UNLICENSED，发行前由维护者决定许可。

## 目录

- cmd/charstle：命令行入口
- internal/app：CLI/桌面共享生命周期
- internal/proxy、mitm、pipeline：代理、TLS 和处理管道
- internal/rules、mock：规则与脚本
- internal/store、events、api：捕获、事件与管理 API
- web：React/Vite 界面
- desktop：独立 Wails module
- npm、scripts、.github/workflows：启动器、分发构建与 CI
