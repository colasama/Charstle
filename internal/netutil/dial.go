package netutil

import (
	"charstle/internal/config"
	"context"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"golang.org/x/net/dns/dnsmessage"
	"io"
	"net"
	"time"
)

type Dialer struct {
	cfg  config.Upstream
	base *net.Dialer
}

func NewDialer(cfg config.Upstream) *Dialer {
	d := &net.Dialer{Timeout: 15 * time.Second, KeepAlive: 30 * time.Second}
	if len(cfg.DNSServers) > 0 {
		d.Resolver = &net.Resolver{PreferGo: true, Dial: func(ctx context.Context, network, addr string) (net.Conn, error) {
			var last error
			for _, server := range cfg.DNSServers {
				conn, err := (&net.Dialer{Timeout: 3 * time.Second}).DialContext(ctx, network, dnsAddr(server))
				if err == nil {
					return conn, nil
				}
				last = err
			}
			return nil, last
		}}
	}
	return &Dialer{cfg, d}
}
func dnsAddr(s string) string {
	if _, _, err := net.SplitHostPort(s); err != nil {
		return net.JoinHostPort(s, "53")
	}
	return s
}
func (d *Dialer) Dial(network, addr string) (net.Conn, error) {
	return d.DialContext(context.Background(), network, addr)
}
func (d *Dialer) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}
	if d.cfg.UseHostsFile || net.ParseIP(host) != nil || len(d.cfg.DNSServers) == 0 {
		return d.base.DialContext(ctx, network, addr)
	}
	var last error
	for _, server := range d.cfg.DNSServers {
		for _, kind := range []dnsmessage.Type{dnsmessage.TypeA, dnsmessage.TypeAAAA} {
			ips, err := lookup(ctx, server, host, kind)
			if err != nil {
				last = err
				continue
			}
			for _, ip := range ips {
				conn, err := d.base.DialContext(ctx, network, net.JoinHostPort(ip, port))
				if err == nil {
					return conn, nil
				}
				last = err
			}
		}
	}
	if last == nil {
		last = fmt.Errorf("no DNS address for %s", host)
	}
	return nil, last
}
func lookup(ctx context.Context, server, host string, kind dnsmessage.Type) ([]string, error) {
	name, err := dnsmessage.NewName(host + ".")
	if err != nil {
		return nil, err
	}
	var id [2]byte
	if _, err = rand.Read(id[:]); err != nil {
		return nil, err
	}
	msg := dnsmessage.Message{Header: dnsmessage.Header{ID: binary.BigEndian.Uint16(id[:]), RecursionDesired: true}, Questions: []dnsmessage.Question{{Name: name, Type: kind, Class: dnsmessage.ClassINET}}}
	packet, err := msg.Pack()
	if err != nil {
		return nil, err
	}
	// DNS over TCP also handles answers too large for a UDP datagram.
	conn, err := (&net.Dialer{Timeout: 3 * time.Second}).DialContext(ctx, "tcp", dnsAddr(server))
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	deadline := time.Now().Add(3 * time.Second)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	conn.SetDeadline(deadline)
	prefix := make([]byte, 2)
	binary.BigEndian.PutUint16(prefix, uint16(len(packet)))
	if _, err = conn.Write(append(prefix, packet...)); err != nil {
		return nil, err
	}
	if _, err = io.ReadFull(conn, prefix); err != nil {
		return nil, err
	}
	packet = make([]byte, int(binary.BigEndian.Uint16(prefix)))
	if _, err = io.ReadFull(conn, packet); err != nil {
		return nil, err
	}
	var response dnsmessage.Message
	if err = response.Unpack(packet); err != nil {
		return nil, err
	}
	if response.ID != msg.ID || !response.Response || response.RCode != dnsmessage.RCodeSuccess {
		return nil, fmt.Errorf("DNS query failed for %s", host)
	}
	out := []string{}
	for _, a := range response.Answers {
		switch v := a.Body.(type) {
		case *dnsmessage.AResource:
			out = append(out, net.IP(v.A[:]).String())
		case *dnsmessage.AAAAResource:
			out = append(out, net.IP(v.AAAA[:]).String())
		}
	}
	return out, nil
}
