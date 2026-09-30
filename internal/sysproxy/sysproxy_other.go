//go:build !windows && !darwin

package sysproxy

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

func gsettings(args ...string) (string, error) {
	out, err := exec.Command("gsettings", args...).CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("GNOME system proxy: %w: %s (on other desktops configure the proxy manually)", err, out)
	}
	return strings.TrimSpace(string(out)), nil
}
func enable(host string, port int, bypass []string) (Settings, error) {
	changes := map[string]string{"org.gnome.system.proxy mode": "'manual'", "org.gnome.system.proxy.http host": strconv.Quote(host), "org.gnome.system.proxy.http port": strconv.Itoa(port), "org.gnome.system.proxy.http use-authentication": "false", "org.gnome.system.proxy.https host": strconv.Quote(host), "org.gnome.system.proxy.https port": strconv.Itoa(port)}
	quoted := []string{}
	for _, s := range bypass {
		quoted = append(quoted, strconv.Quote(s))
	}
	changes["org.gnome.system.proxy ignore-hosts"] = "[" + strings.Join(quoted, ", ") + "]"
	prev := Settings{Raw: map[string]string{}}
	for key := range changes {
		parts := strings.SplitN(key, " ", 2)
		v, err := gsettings("get", parts[0], parts[1])
		if err != nil {
			return prev, err
		}
		prev.Raw[key] = v
	}
	for key, value := range changes {
		parts := strings.SplitN(key, " ", 2)
		if _, err := gsettings("set", parts[0], parts[1], value); err != nil {
			restore(prev)
			return prev, err
		}
	}
	return prev, nil
}
func restore(prev Settings) error {
	var first error
	for key, value := range prev.Raw {
		parts := strings.SplitN(key, " ", 2)
		if len(parts) != 2 {
			continue
		}
		if _, err := gsettings("set", parts[0], parts[1], value); err != nil && first == nil {
			first = err
		}
	}
	return first
}
