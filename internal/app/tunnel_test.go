package app

import (
	"bufio"
	"charstle/internal/config"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"testing"
	"time"
)

func TestBannerFirstCONNECT(t *testing.T) {
	upstream, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer upstream.Close()
	go func() {
		c, e := upstream.Accept()
		if e != nil {
			return
		}
		defer c.Close()
		c.SetDeadline(time.Now().Add(5 * time.Second))
		io.WriteString(c, "SSH-test\n")
		io.Copy(c, c)
	}()
	core, err := New(config.Default(t.TempDir()))
	if err != nil {
		t.Fatal(err)
	}
	defer core.Close()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- core.Proxy.Serve(ctx, listener) }()
	defer func() { cancel(); <-done }()
	client, err := net.Dial("tcp", listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	client.SetDeadline(time.Now().Add(4 * time.Second))
	fmt.Fprintf(client, "CONNECT %s HTTP/1.1\r\nHost: %s\r\n\r\n", upstream.Addr(), upstream.Addr())
	reader := bufio.NewReader(client)
	response, err := http.ReadResponse(reader, &http.Request{Method: "CONNECT"})
	if err != nil || response.StatusCode != 200 {
		t.Fatalf("%v %v", response, err)
	}
	line, err := reader.ReadString('\n')
	if err != nil || line != "SSH-test\n" {
		t.Fatalf("%q %v", line, err)
	}
	io.WriteString(client, "hello\n")
	line, err = reader.ReadString('\n')
	if err != nil || line != "hello\n" {
		t.Fatalf("%q %v", line, err)
	}
}
