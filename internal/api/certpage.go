package api

import (
	_ "embed"
	"fmt"
	"html/template"
	"net"
	"net/http"
	"strconv"
	"strings"

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
		w.Write(ca.PEM())
	})
	mux.HandleFunc("GET /charstle.mobileconfig", func(w http.ResponseWriter, r *http.Request) {
		data, err := ca.MobileConfig()
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "application/x-apple-aspen-config")
		w.Write(data)
	})
	mux.HandleFunc("GET /proxy.pac", func(w http.ResponseWriter, r *http.Request) {
		host := strings.Split(r.Host, ":")[0]
		if host == "charstle.pro" || net.ParseIP(host) == nil {
			host = "127.0.0.1"
			for _, a := range proxyAddresses() {
				if a.Primary {
					host = a.IP
					break
				}
			}
		}
		w.Header().Set("Content-Type", "application/x-ns-proxy-autoconfig")
		fmt.Fprintf(w, "function FindProxyForURL(url, host) { if (isPlainHostName(host) || host === 'localhost' || host === '127.0.0.1') return 'DIRECT'; return %q; }", "PROXY "+net.JoinHostPort(host, strconv.Itoa(cfg.ProxyPort))+"; DIRECT")
	})
	return mux
}
