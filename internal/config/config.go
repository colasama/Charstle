// Package config 定义全部可配置项，与前端 types/settings.ts 对应。
package config

import (
	"fmt"
	"net"
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
	// TODO: 读取并合并 config.json；不存在则写入默认值
	return cfg, nil
}

// Save 写回 dataDir/config.json。
func (c *Config) Save() error {
	// TODO
	return fmt.Errorf("config.Save: not implemented")
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
