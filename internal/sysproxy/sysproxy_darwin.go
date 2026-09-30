//go:build darwin

package sysproxy

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

func network(args ...string) (string, error) {
	out, err := exec.Command("networksetup", args...).CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("networksetup: %w: %s", err, out)
	}
	return strings.TrimSpace(string(out)), nil
}
func enable(host string, port int, bypass []string) (Settings, error) {
	list, err := network("-listallnetworkservices")
	if err != nil {
		return Settings{}, err
	}
	prev := Settings{Raw: map[string]string{}}
	for i, service := range strings.Split(list, "\n") {
		if i == 0 || strings.HasPrefix(service, "*") || service == "" {
			continue
		}
		for _, kind := range []string{"webproxy", "securewebproxy", "proxybypassdomains"} {
			out, e := network("-get"+kind, service)
			if e != nil {
				return prev, e
			}
			key, _ := json.Marshal([]string{service, kind})
			prev.Raw[string(key)] = out
		}
	}
	for key := range prev.Raw {
		var pair []string
		json.Unmarshal([]byte(key), &pair)
		service, kind := pair[0], pair[1]
		args := []string{"-set" + kind, service, host, strconv.Itoa(port)}
		if kind == "proxybypassdomains" {
			args = []string{"-setproxybypassdomains", service}
			if len(bypass) == 0 {
				args = append(args, "Empty")
			} else {
				args = append(args, bypass...)
			}
		}
		if _, err = network(args...); err != nil {
			restore(prev)
			return prev, err
		}
	}
	return prev, nil
}
func restore(prev Settings) error {
	var first error
	for key, value := range prev.Raw {
		var pair []string
		if err := json.Unmarshal([]byte(key), &pair); err != nil {
			return err
		}
		service, kind := pair[0], pair[1]
		if kind == "proxybypassdomains" {
			domains := strings.Split(value, "\n")
			if strings.HasPrefix(value, "There aren't") {
				domains = []string{"Empty"}
			}
			_, err := network(append([]string{"-setproxybypassdomains", service}, domains...)...)
			if err != nil && first == nil {
				first = err
			}
			continue
		}
		fields := map[string]string{}
		for _, line := range strings.Split(value, "\n") {
			k, v, _ := strings.Cut(line, ":")
			fields[k] = strings.TrimSpace(v)
		}
		if fields["Server"] != "" {
			if _, err := network("-set"+kind, service, fields["Server"], fields["Port"]); err != nil && first == nil {
				first = err
			}
		}
		state := "off"
		if fields["Enabled"] == "Yes" {
			state = "on"
		}
		if _, err := network("-set"+kind+"state", service, state); err != nil && first == nil {
			first = err
		}
	}
	return first
}
