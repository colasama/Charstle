//go:build !windows && !darwin

package sysproxy

import "errors"

// Linux 桌面环境差异太大（GNOME gsettings / KDE kwriteconfig），暂不支持。
func enable(host string, port int, bypass []string) (Settings, error) {
	return Settings{}, errors.New("sysproxy: unsupported platform")
}

func restore(prev Settings) error {
	return errors.New("sysproxy: unsupported platform")
}
