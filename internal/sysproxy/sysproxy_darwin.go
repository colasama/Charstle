//go:build darwin

package sysproxy

import "errors"

// macOS：对每个活动网络服务执行
//
//	networksetup -setwebproxy <service> <host> <port>
//	networksetup -setsecurewebproxy <service> <host> <port>
//	networksetup -setproxybypassdomains <service> <domains...>
func enable(host string, port int, bypass []string) (Settings, error) {
	// TODO
	return Settings{}, errors.New("sysproxy: not implemented on darwin")
}

func restore(prev Settings) error {
	// TODO
	return errors.New("sysproxy: not implemented on darwin")
}
