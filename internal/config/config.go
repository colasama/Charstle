// Package config 定义全部可配置项，与前端 types/settings.ts 对应。
package config

import (
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
)

type Config struct {
	DataDir string `json:"-"`

	ProxyPort  int    `json:"proxyPort"`
	ListenAddr string `json:"listenAddr"` // 0.0.0.0 允许局域网接入

	AdminPort      int    `json:"adminPort"`
	AdminLanAccess bool   `json:"adminLanAccess"`
	AdminPassword  string `json:"adminPassword"`

	Capture  Capture  `json:"capture"`
	Protocol Protocol `json:"protocol"`
	Upstream Upstream `json:"upstream"`
	Access   Access   `json:"access"`
	SSL      SSL      `json:"ssl"`

	SystemProxyBypass []string `json:"systemProxyBypass"`
}

type Capture struct {
	MaxSessions        int    `json:"maxSessions"`
	MaxMemoryMB        int    `json:"maxMemoryMB"`
	BodyCaptureLimitKB int    `json:"bodyCaptureLimitKB"`
	SpillDir           string `json:"spillDir"`
	RecordTunnels      bool   `json:"recordTunnels"`
	BreakpointTimeoutS int    `json:"breakpointTimeoutS"`
}

type Protocol struct {
	HTTP2            bool `json:"http2"`
	CaptureWebSocket bool `json:"captureWebSocket"`
	DecodeBody       bool `json:"decodeBody"`
}

type Upstream struct {
	Proxy        string   `json:"proxy"` // http://… 或 socks5://…
	Bypass       []string `json:"bypass"`
	DNSServers   []string `json:"dnsServers"`
	UseHostsFile bool     `json:"useHostsFile"`
	InsecureTLS  bool     `json:"insecureTLS"`
}

type AccessMode string

const (
	AccessAsk       AccessMode = "ask"
	AccessWhitelist AccessMode = "whitelist"
	AccessAllowAll  AccessMode = "allowAll"
)

type Access struct {
	Mode      AccessMode `json:"mode"`
	Whitelist []string   `json:"whitelist"` // IP / CIDR
	Blacklist []string   `json:"blacklist"`
}

type SSL struct {
	Enabled bool     `json:"enabled"`
	Include []string `json:"include"` // 空 = 全部解密
	Exclude []string `json:"exclude"`
}

func Default(dataDir string) *Config {
	return &Config{
		DataDir:    dataDir,
		ProxyPort:  8888,
		ListenAddr: "0.0.0.0",
		AdminPort:  8899,
		Capture: Capture{
			MaxSessions:        10000,
			MaxMemoryMB:        500,
			BodyCaptureLimitKB: 10 * 1024,
			RecordTunnels:      true,
			BreakpointTimeoutS: 300,
		},
		Protocol: Protocol{HTTP2: true, CaptureWebSocket: true, DecodeBody: true},
		Upstream: Upstream{UseHostsFile: true},
		Access:   Access{Mode: AccessAsk, Whitelist: []string{"127.0.0.1/32", "::1/128"}},
		SSL:      SSL{Enabled: true, Exclude: []string{"*.apple.com", "*.icloud.com"}},
	}
}

// Load 读取 dataDir/config.json，不存在时返回默认配置。
func Load(dataDir string) (*Config, error) {
	cfg := Default(dataDir)
	data, err := os.ReadFile(filepath.Join(dataDir, "config.json"))
	if os.IsNotExist(err) {
		return cfg, cfg.Save()
	}
	if err != nil {
		return nil, err
	}
	if err = json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	if err = cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// Save 写回 dataDir/config.json。
func (c *Config) Save() error {
	if err := c.Validate(); err != nil {
		return err
	}
	return WriteJSON(filepath.Join(c.DataDir, "config.json"), c)
}

func (c *Config) Validate() error {
	if c.Upstream.Proxy != "" {
		u, err := url.Parse(c.Upstream.Proxy)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https" && u.Scheme != "socks5" && u.Scheme != "socks5h") {
			return fmt.Errorf("invalid upstream proxy URL")
		}
	}
	if !c.Upstream.UseHostsFile && len(c.Upstream.DNSServers) == 0 {
		return fmt.Errorf("disabling hosts requires explicit DNS servers")
	}
	if c.Capture.BreakpointTimeoutS < 1 || c.Capture.BreakpointTimeoutS > 86400 {
		return fmt.Errorf("breakpoint timeout must be 1..86400 seconds")
	}
	if c.ProxyPort < 1 || c.ProxyPort > 65535 || c.AdminPort < 1 || c.AdminPort > 65535 || c.ProxyPort == c.AdminPort {
		return fmt.Errorf("proxy/admin ports must be distinct and between 1 and 65535")
	}
	if net.ParseIP(c.ListenAddr) == nil {
		return fmt.Errorf("listenAddr must be an IP address")
	}
	if c.AdminLanAccess && c.AdminPassword == "" {
		return fmt.Errorf("LAN administration requires a password")
	}
	if c.Capture.MaxSessions < 1 || c.Capture.MaxMemoryMB < 1 || c.Capture.BodyCaptureLimitKB < 0 {
		return fmt.Errorf("invalid capture limits")
	}
	return nil
}

func (c *Config) ProxyAddr() string {
	return net.JoinHostPort(c.ListenAddr, strconv.Itoa(c.ProxyPort))
}

func (c *Config) AdminAddr() string {
	host := "127.0.0.1"
	if c.AdminLanAccess {
		host = "0.0.0.0"
	}
	return net.JoinHostPort(host, strconv.Itoa(c.AdminPort))
}
