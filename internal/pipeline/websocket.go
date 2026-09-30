package pipeline

import (
	"charstle/internal/flow"
	"charstle/internal/store"
	"encoding/binary"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

func (p *Pipeline) websocket(w http.ResponseWriter, c *flow.Context) error {
	hijack, ok := w.(http.Hijacker)
	if !ok {
		return fmt.Errorf("WebSocket upgrade requires HTTP/1.1")
	}
	up, ok := c.Resp.Body.(io.ReadWriteCloser)
	if !ok {
		return fmt.Errorf("upstream is not bidirectional")
	}
	down, buf, err := hijack.Hijack()
	if err != nil {
		return err
	}
	defer down.Close()
	defer up.Close()
	fmt.Fprintf(buf, "HTTP/1.1 101 Switching Protocols\r\n")
	c.Resp.Header.Write(buf)
	fmt.Fprint(buf, "\r\n")
	if err = buf.Flush(); err != nil {
		return err
	}
	var mu sync.Mutex
	frameID := 0
	record := func(dir string, opcode byte, n uint64, data []byte) {
		mu.Lock()
		defer mu.Unlock()
		if dir == "out" {
			c.Session.ReqSize += int64(n)
		} else {
			c.Session.RespSize += int64(n)
		}
		kind := map[byte]string{0: "continuation", 1: "text", 2: "binary", 8: "close", 9: "ping", 10: "pong"}[opcode]
		if !p.opt.Protocol.CaptureWebSocket {
			return
		}
		frameID++
		c.Session.Frames = append(c.Session.Frames, store.WsFrame{ID: frameID, Dir: dir, Opcode: kind, Size: int(n), Time: time.Now(), Data: store.Body(data)})
		if len(c.Session.Frames) > 1000 {
			c.Session.Frames = c.Session.Frames[len(c.Session.Frames)-1000:]
		}
		p.opt.Store.Update(c.Session)
	}
	done := make(chan error, 2)
	go func() { done <- relayFrames(up, buf, "out", record) }()
	go func() { done <- relayFrames(down, up, "in", record) }()
	err = <-done
	down.Close()
	up.Close()
	<-done
	if err == io.EOF {
		return nil
	}
	return err
}
func relayFrames(dst io.Writer, src io.Reader, dir string, record func(string, byte, uint64, []byte)) error {
	for {
		header := make([]byte, 2)
		if _, err := io.ReadFull(src, header); err != nil {
			return err
		}
		n := uint64(header[1] & 127)
		if n == 126 {
			extra := make([]byte, 2)
			if _, err := io.ReadFull(src, extra); err != nil {
				return err
			}
			header = append(header, extra...)
			n = uint64(binary.BigEndian.Uint16(extra))
		} else if n == 127 {
			extra := make([]byte, 8)
			if _, err := io.ReadFull(src, extra); err != nil {
				return err
			}
			header = append(header, extra...)
			n = binary.BigEndian.Uint64(extra)
			if n>>63 != 0 {
				return fmt.Errorf("invalid frame size")
			}
		}
		var mask []byte
		if header[1]&128 != 0 {
			mask = make([]byte, 4)
			if _, err := io.ReadFull(src, mask); err != nil {
				return err
			}
			header = append(header, mask...)
		}
		if _, err := dst.Write(header); err != nil {
			return err
		}
		data := []byte{}
		buffer := make([]byte, 32<<10)
		var sent uint64
		for sent < n {
			chunk := buffer[:min(uint64(len(buffer)), n-sent)]
			if _, err := io.ReadFull(src, chunk); err != nil {
				return err
			}
			if _, err := dst.Write(chunk); err != nil {
				return err
			}
			for i, b := range chunk {
				if len(data) < 64<<10 {
					if mask != nil {
						b ^= mask[(sent+uint64(i))%4]
					}
					data = append(data, b)
				}
			}
			sent += uint64(len(chunk))
		}
		record(dir, header[0]&15, n, data)
	}
}
