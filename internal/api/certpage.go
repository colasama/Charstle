package api

import (
	_ "embed"
	"html/template"
	"net/http"

	"charstle/internal/config"
	"charstle/internal/mitm"
)

//go:embed static/ssl.html
var sslPageHTML string

var sslPage = template.Must(template.New("ssl").Parse(sslPageHTML))

// CertPageHandler 挂在代理端口上，供手机设置代理后访问：
//
//	http://charstle.pro/                   证书安装页
//	http://charstle.pro/charstle-ca.crt    DER 证书
//	http://charstle.pro/charstle-ca.pem    PEM 证书
//	http://charstle.pro/charstle.mobileconfig  iOS 描述文件
//	http://charstle.pro/proxy.pac          PAC 文件
func CertPageHandler(ca *mitm.CA, cfg *config.Config) http.Handler {
	mux := http.NewServeMux()
	page := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		sslPage.Execute(w, map[string]any{
			"Fingerprint": ca.Fingerprint(),
			"ProxyPort":   cfg.ProxyPort,
		})
	}
	mux.HandleFunc("GET /{$}", page)
	mux.HandleFunc("GET /ssl", page)
	mux.HandleFunc("GET /charstle-ca.crt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-x509-ca-cert")
		w.Write(ca.DER())
	})
	mux.HandleFunc("GET /charstle-ca.pem", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-pem-file")
		w.Header().Set("Content-Disposition", `attachment; filename="charstle-ca.pem"`)
		w.Write(ca.CertPEM)
	})
	mux.HandleFunc("GET /charstle.mobileconfig", func(w http.ResponseWriter, r *http.Request) {
		// TODO: ca.MobileConfig()
		http.Error(w, "not implemented", http.StatusNotImplemented)
	})
	mux.HandleFunc("GET /proxy.pac", func(w http.ResponseWriter, r *http.Request) {
		// TODO: 生成 PAC：function FindProxyForURL(url, host) { return "PROXY <ip>:<port>; DIRECT"; }
		http.Error(w, "not implemented", http.StatusNotImplemented)
	})
	return mux
}
