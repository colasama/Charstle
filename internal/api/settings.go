package api

import (
	"charstle/internal/config"
	"charstle/internal/proxy"
	"encoding/json"
	"fmt"
	"strings"
)

func proxyAddresses() []proxy.LanAddress {
	v := proxy.LANAddresses()
	if len(v) == 0 {
		return []proxy.LanAddress{{Iface: "Loopback", IP: "127.0.0.1", Primary: true}}
	}
	return v
}
func settings(c *config.Config) map[string]any {
	return map[string]any{"proxyPort": c.ProxyPort, "listenAddr": c.ListenAddr, "adminPort": c.AdminPort, "adminLanAccess": c.AdminLanAccess, "adminPassword": c.AdminPassword, "maxSessions": c.Capture.MaxSessions, "maxMemoryMB": c.Capture.MaxMemoryMB, "bodyCaptureLimitKB": c.Capture.BodyCaptureLimitKB, "spillDir": c.Capture.SpillDir, "recordTunnels": c.Capture.RecordTunnels, "breakpointTimeoutS": c.Capture.BreakpointTimeoutS, "http2": c.Protocol.HTTP2, "captureWebSocket": c.Protocol.CaptureWebSocket, "decodeBody": c.Protocol.DecodeBody, "upstreamProxy": c.Upstream.Proxy, "upstreamBypass": strings.Join(c.Upstream.Bypass, "\n"), "dnsServers": strings.Join(c.Upstream.DNSServers, ", "), "useHostsFile": c.Upstream.UseHostsFile, "systemProxyBypass": strings.Join(c.SystemProxyBypass, "\n")}
}
func applySettings(c *config.Config, fields map[string]json.RawMessage) error {
	direct := map[string]any{"proxyPort": &c.ProxyPort, "listenAddr": &c.ListenAddr, "adminPort": &c.AdminPort, "adminLanAccess": &c.AdminLanAccess, "adminPassword": &c.AdminPassword, "maxSessions": &c.Capture.MaxSessions, "maxMemoryMB": &c.Capture.MaxMemoryMB, "bodyCaptureLimitKB": &c.Capture.BodyCaptureLimitKB, "spillDir": &c.Capture.SpillDir, "recordTunnels": &c.Capture.RecordTunnels, "breakpointTimeoutS": &c.Capture.BreakpointTimeoutS, "http2": &c.Protocol.HTTP2, "captureWebSocket": &c.Protocol.CaptureWebSocket, "decodeBody": &c.Protocol.DecodeBody, "upstreamProxy": &c.Upstream.Proxy, "useHostsFile": &c.Upstream.UseHostsFile}
	for k, v := range fields {
		if target, ok := direct[k]; ok {
			if err := json.Unmarshal(v, target); err != nil {
				return fmt.Errorf("%s: %w", k, err)
			}
			continue
		}
		var text string
		if err := json.Unmarshal(v, &text); err != nil {
			return err
		}
		list := strings.FieldsFunc(text, func(r rune) bool { return r == ',' || r == '\n' || r == '\r' })
		for i := range list {
			list[i] = strings.TrimSpace(list[i])
		}
		switch k {
		case "upstreamBypass":
			c.Upstream.Bypass = list
		case "dnsServers":
			c.Upstream.DNSServers = list
		case "systemProxyBypass":
			c.SystemProxyBypass = list
		default:
			return fmt.Errorf("unknown setting: %s", k)
		}
	}
	return c.Validate()
}
