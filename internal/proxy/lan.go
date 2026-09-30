package proxy

import (
	"net"
	"strings"
)

type LanAddress struct {
	Iface   string `json:"iface"`
	IP      string `json:"ip"`
	Primary bool   `json:"primary,omitempty"`
}

// LANAddresses 列出本机可供局域网设备连接的 IPv4 地址。
// Primary 标记最可能是「当前 Wi-Fi / 以太网」的那一个（排除虚拟网卡）。
func LANAddresses() []LanAddress {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var out []LanAddress
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := ifc.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok || ipn.IP.To4() == nil {
				continue
			}
			out = append(out, LanAddress{Iface: ifc.Name, IP: ipn.IP.String()})
		}
	}
	// UDP connect asks the OS to select a route without sending a packet.
	if conn, err := net.Dial("udp4", "192.0.2.1:9"); err == nil {
		ip := conn.LocalAddr().(*net.UDPAddr).IP.String()
		conn.Close()
		for i := range out {
			if out[i].IP == ip && !isVirtual(out[i].Iface, out[i].IP) {
				out[i].Primary = true
				return out
			}
		}
	}
	for i := range out {
		if !isVirtual(out[i].Iface, out[i].IP) {
			out[i].Primary = true
			break
		}
	}
	return out
}

var virtualIfaceHints = []string{"vethernet", "docker", "vmware", "virtualbox", "wsl", "tun", "tap", "mihomo", "clash", "utun", "zerotier", "tailscale"}

func isVirtual(iface, ip string) bool {
	name := strings.ToLower(iface)
	for _, h := range virtualIfaceHints {
		if strings.Contains(name, h) {
			return true
		}
	}
	// 198.18.0.0/15 常被 TUN 模式代理占用
	return strings.HasPrefix(ip, "198.18.") || strings.HasPrefix(ip, "198.19.")
}
