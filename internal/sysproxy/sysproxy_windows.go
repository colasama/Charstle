//go:build windows

package sysproxy

import "errors"

// Windows：写注册表
//
//	HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings
//	  ProxyEnable (DWORD) / ProxyServer (SZ) / ProxyOverride (SZ)
//
// 然后调用 wininet!InternetSetOptionW(INTERNET_OPTION_SETTINGS_CHANGED / INTERNET_OPTION_REFRESH)
// 让已运行的程序立即生效（golang.org/x/sys/windows/registry + syscall）。
func enable(host string, port int, bypass []string) (Settings, error) {
	// TODO
	return Settings{}, errors.New("sysproxy: not implemented on windows")
}

func restore(prev Settings) error {
	// TODO
	return errors.New("sysproxy: not implemented on windows")
}
