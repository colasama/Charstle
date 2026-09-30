//go:build windows

package sysproxy

import (
	"errors"
	"fmt"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
	"net"
	"strconv"
	"strings"
)

const keyPath = `Software\Microsoft\Windows\CurrentVersion\Internet Settings`

var names = []string{"ProxyEnable", "ProxyServer", "ProxyOverride", "AutoConfigURL", "AutoDetect"}

func enable(host string, port int, bypass []string) (Settings, error) {
	k, err := registry.OpenKey(registry.CURRENT_USER, keyPath, registry.QUERY_VALUE|registry.SET_VALUE)
	if err != nil {
		return Settings{}, err
	}
	defer k.Close()
	prev := Settings{Raw: map[string]string{}}
	for _, name := range names {
		if name == "ProxyEnable" || name == "AutoDetect" {
			v, _, e := k.GetIntegerValue(name)
			if errors.Is(e, registry.ErrNotExist) {
				prev.Raw[name] = "missing"
			} else if e != nil {
				return prev, e
			} else {
				prev.Raw[name] = strconv.FormatUint(v, 10)
			}
		} else {
			v, _, e := k.GetStringValue(name)
			if errors.Is(e, registry.ErrNotExist) {
				prev.Raw[name] = "missing"
			} else if e != nil {
				return prev, e
			} else {
				prev.Raw[name] = "s:" + v
			}
		}
	}
	if err = k.SetStringValue("ProxyServer", net.JoinHostPort(host, strconv.Itoa(port))); err == nil {
		err = k.SetStringValue("ProxyOverride", strings.Join(bypass, ";"))
	}
	if err == nil {
		err = k.SetDWordValue("ProxyEnable", 1)
	}
	if err == nil {
		err = k.SetDWordValue("AutoDetect", 0)
	}
	if err == nil {
		e := k.DeleteValue("AutoConfigURL")
		if !errors.Is(e, registry.ErrNotExist) {
			err = e
		}
	}
	if err != nil {
		restore(prev)
		return prev, err
	}
	if err = notify(); err != nil {
		restore(prev)
		return prev, err
	}
	return prev, nil
}
func restore(prev Settings) error {
	k, err := registry.OpenKey(registry.CURRENT_USER, keyPath, registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer k.Close()
	for _, name := range names {
		v, ok := prev.Raw[name]
		if !ok {
			continue
		}
		var e error
		if v == "missing" {
			e = k.DeleteValue(name)
			if errors.Is(e, registry.ErrNotExist) {
				e = nil
			}
		} else if strings.HasPrefix(v, "s:") {
			e = k.SetStringValue(name, v[2:])
		} else {
			n, _ := strconv.ParseUint(v, 10, 32)
			e = k.SetDWordValue(name, uint32(n))
		}
		if e != nil {
			return e
		}
	}
	return notify()
}
func notify() error {
	proc := windows.NewLazySystemDLL("wininet.dll").NewProc("InternetSetOptionW")
	for _, option := range []uintptr{39, 37} {
		r, _, err := proc.Call(0, option, 0, 0)
		if r == 0 {
			return fmt.Errorf("refresh system proxy: %w", err)
		}
	}
	return nil
}
