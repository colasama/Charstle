package netutil

import (
	"charstle/internal/config"
	"context"
	"encoding/binary"
	"golang.org/x/net/dns/dnsmessage"
	"io"
	"net"
	"testing"
	"time"
)

func TestExplicitDNSWithoutHosts(t *testing.T) {
	dns, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer dns.Close()
	go func() {
		c, err := dns.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		size := make([]byte, 2)
		io.ReadFull(c, size)
		packet := make([]byte, binary.BigEndian.Uint16(size))
		io.ReadFull(c, packet)
		var m dnsmessage.Message
		m.Unpack(packet)
		m.Response = true
		m.Answers = []dnsmessage.Resource{{Header: dnsmessage.ResourceHeader{Name: m.Questions[0].Name, Type: dnsmessage.TypeA, Class: dnsmessage.ClassINET, TTL: 1}, Body: &dnsmessage.AResource{A: [4]byte{127, 0, 0, 1}}}}
		packet, _ = m.Pack()
		binary.BigEndian.PutUint16(size, uint16(len(packet)))
		c.Write(append(size, packet...))
	}()
	target, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer target.Close()
	go func() {
		c, err := target.Accept()
		if err == nil {
			c.Close()
		}
	}()
	_, port, _ := net.SplitHostPort(target.Addr().String())
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	d := NewDialer(config.Upstream{UseHostsFile: false, DNSServers: []string{dns.Addr().String()}})
	c, err := d.DialContext(ctx, "tcp", net.JoinHostPort("charstle.test", port))
	if err != nil {
		t.Fatal(err)
	}
	c.Close()
}
