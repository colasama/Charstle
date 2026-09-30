// Package web 把前端构建产物（npm run build → web/dist）打包进 Go 二进制。
package web

import "embed"

//go:embed all:dist
var Dist embed.FS
