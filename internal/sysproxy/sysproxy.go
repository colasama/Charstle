// Package sysproxy 开关本机系统代理。
package sysproxy

// Settings 是开启前的原始系统代理配置，用于退出时恢复。
type Settings struct {
	Enabled bool
	Server  string
	Bypass  string
}

// Enable 把系统 HTTP/HTTPS 代理指向 host:port，并返回原设置用于恢复。
func Enable(host string, port int, bypass []string) (prev Settings, err error) {
	return enable(host, port, bypass)
}

// Restore 恢复到 Enable 之前的设置。
func Restore(prev Settings) error {
	return restore(prev)
}
