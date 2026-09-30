# Charstle 分发方案

## 结论

推荐同时发布「独立 CLI 二进制」和「npm/npx 启动器」。代理及管理界面已经嵌入同一 Go 程序，npx 只需选择并启动对应平台的程序，不需要额外 HTTP 服务或安装 Go。桌面壳作为可选下载，单独构建。

| 形式 | 用户环境 | 当前状态 |
| --- | --- | --- |
| GitHub Release 独立文件 | 无 Node/Go 依赖 | 已实现六平台构建和 SHA-256 |
| npm/npx | Node.js >=18，建议 22+ | 启动器和平台包已实现，尚未公开发布 |
| Wails 桌面应用 | 平台 WebView/GTK 运行库 | Windows 可编译，macOS 原生菜单替代托盘；需平台验收与签名 |
| Homebrew / Scoop / WinGet | 对应包管理器 | 可引用 Release 文件与校验和；待稳定下载 URL 后制作清单 |
| Docker | Docker | 可运行 headless 核心，但手机接入、CA 与宿主系统代理更繁琐；暂不提供镜像 |
| go install | Go | 远程安装还涉及当前 module 名和前端构建产物，不作为本次发行入口 |

## npm 结构

主包 charstle 提供 bin.charstle = npm/cli.cjs，并固定同版本 optionalDependencies：

- charstle-win32-x64 / charstle-win32-arm64
- charstle-darwin-x64 / charstle-darwin-arm64
- charstle-linux-x64 / charstle-linux-arm64

平台包通过 package.json 的 os/cpu 声明让 npm 选择兼容平台。主包 require.resolve 对应平台包，启动 bin/charstle 或 bin/charstle.exe 并透传参数、标准输入输出和退出码。没有 postinstall 下载器；企业禁用安装脚本时也可以运行。用户不能省略 optional dependencies。

Linux 二进制使用纯 Go 构建，不依赖 glibc，适合普通 Linux 和 musl/Alpine 环境；系统代理功能仍依赖宿主桌面工具。

2026-09-30 查询 npm 主包 charstle 返回 404。包名可用性会变化，发布前必须重新检查全部七个包；若被占用，可统一改为维护者控制的 scope，并同步启动器、依赖、打包脚本中的名字。404 不保证发布时拥有该名字。

## 构建

在仓库根目录运行：

```sh
npm --prefix web ci
npm --prefix web run build
go test -race ./...
go vet ./...
node --test npm/cli.test.cjs
node scripts/package.mjs all
```

输出：

- dist/charstle-0.1.0-{win32,darwin,linux}-{x64,arm64}[.exe]
- dist/SHA256SUMS-all.txt
- dist/npm/charstle-*/package.json 与 bin/
- 前端、Go 运行时与代理核心全部在原生文件内

也可传单个目标，例如 node scripts/package.mjs win32-x64。更新版本时要同时更新主包 version 和全部 optionalDependencies；prepublishOnly 会检查一致性。构建过程从主包注入 CLI 版本。

GitHub Actions 的 Verify 工作流在 Windows/macOS/Linux 上构建前端并执行 Go 竞态测试、vet 和启动器测试；Build release artifacts 手动触发，只上传产物，不发布到 npm 或创建 Release。

## 打包与本地验收

PowerShell 示例：

```powershell
New-Item -ItemType Directory -Force dist/tarballs
Get-ChildItem dist/npm -Directory | ForEach-Object {
  npm pack $_.FullName --pack-destination dist/tarballs
}
npm pack --pack-destination dist/tarballs
```

从一个空目录安装主包与本机平台的两个 tgz。Windows x64 示例（把路径换成实际绝对路径）：

```powershell
npm install --ignore-scripts --no-audit --no-fund E:/code/Charstle/dist/tarballs/charstle-0.1.0.tgz E:/code/Charstle/dist/tarballs/charstle-win32-x64-0.1.0.tgz
npx --no-install charstle --version
npx --no-install charstle --no-open --proxy-port 18888 --admin-port 18899 --data-dir ./data
```

验证管理首页、/api/state、实际代理请求及 Ctrl+C 退出。公开发布之后还应在干净 npm 缓存下运行 npx --yes charstle@版本，验证注册表上的 optional dependency 解析，而非只验证本地 tarball。

## 实际发布顺序

本次没有执行 npm publish 或推送 GitHub。

1. 维护者确定许可证与包名归属；更新版本，完成各操作系统实机验收。
2. 构建全部目标，核对 npm pack --dry-run 内容，只包含启动器/文档或平台二进制，不包含 CA、配置、抓包记录。
3. 登录拥有相应包名权限的 npm 账号，先发布六个平台包，确认注册表上相同版本均可获取。
4. 最后在仓库根目录发布主包。用户才可以执行 npx --yes charstle@latest。
5. 将独立二进制和 SHA256SUMS 放入对应版本 GitHub Release；macOS 签名、公证和 Windows 代码签名按发行策略单独处理。
6. 后续可配置 npm Trusted Publishing / OIDC，避免长期令牌；当前工作流不内置发布凭据。

对应手动命令（需要维护者实际发布授权）：

```powershell
Get-ChildItem dist/npm -Directory | ForEach-Object {
  npm publish $_.FullName --access public
  if ($LASTEXITCODE -ne 0) { throw "Platform publish failed" }
}
npm publish --access public
```

npm 缓存负责缓存已安装的原生包。升级用指定新版本或 @latest，诊断旧版本缓存时先执行 --version；项目数据保持在用户的 .charstle 或显式 --data-dir，避免升级覆盖。

## 官方参考

- [npx / npm exec](https://docs.npmjs.com/cli/v11/commands/npx/)：执行包提供的命令
- [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)：bin、optionalDependencies、os、cpu、files
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)：后续自动发行的 OIDC 方案
- [Wails 安装与系统依赖](https://wails.io/docs/gettingstarted/installation/)：桌面版依赖
