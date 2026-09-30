package store

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"compress/zlib"
	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
	"io"
	"os"
	"strings"
	"sync"
)

type BodyRef struct {
	Size      int64
	Truncated bool
	Encoding  string
	inline    []byte
	file      string
}

func Body(data []byte) BodyRef {
	return BodyRef{Size: int64(len(data)), inline: append([]byte(nil), data...)}
}
func (b *BodyRef) Open() (io.ReadCloser, error) {
	if b.file != "" {
		return os.Open(b.file)
	}
	return io.NopCloser(bytes.NewReader(b.inline)), nil
}

type decodedBody struct {
	io.Reader
	close func() error
}

func (d decodedBody) Close() error { return d.close() }
func (b *BodyRef) OpenDecoded() (io.ReadCloser, error) {
	raw, err := b.Open()
	if err != nil {
		return nil, err
	}
	var reader io.Reader = raw
	var closer func() error
	switch strings.ToLower(b.Encoding) {
	case "gzip":
		r, e := gzip.NewReader(raw)
		if e != nil {
			raw.Close()
			return nil, e
		}
		reader = r
		closer = r.Close
	case "deflate":
		r, e := zlib.NewReader(raw)
		if e != nil {
			raw.Close()
			raw, e = b.Open()
			if e != nil {
				return nil, e
			}
			r = flate.NewReader(raw)
		}
		reader = r
		closer = r.Close
	case "br":
		reader = brotli.NewReader(raw)
	case "zstd":
		r, e := zstd.NewReader(raw, zstd.WithDecoderMaxMemory(64<<20))
		if e != nil {
			raw.Close()
			return nil, e
		}
		reader = r
		closer = func() error { r.Close(); return nil }
	}
	return decodedBody{Reader: io.LimitReader(reader, 32<<20), close: func() error {
		if closer != nil {
			closer()
		}
		return raw.Close()
	}}, nil
}

type Capture struct {
	src      io.ReadCloser
	limit    int64
	mu       sync.Mutex
	ref      BodyRef
	once     sync.Once
	closeErr error
}

func NewCapture(src io.ReadCloser, limit int64) *Capture {
	if src == nil {
		src = io.NopCloser(strings.NewReader(""))
	}
	return &Capture{src: src, limit: limit}
}
func (c *Capture) Read(p []byte) (int, error) {
	n, err := c.src.Read(p)
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ref.Size += int64(n)
	left := max(c.limit-int64(len(c.ref.inline)), 0)
	keep := min(int64(n), left)
	c.ref.inline = append(c.ref.inline, p[:keep]...)
	if keep < int64(n) {
		c.ref.Truncated = true
	}
	return n, err
}
func (c *Capture) Close() error { c.once.Do(func() { c.closeErr = c.src.Close() }); return c.closeErr }
func (c *Capture) Snapshot() BodyRef {
	c.mu.Lock()
	defer c.mu.Unlock()
	r := c.ref
	r.inline = append([]byte(nil), r.inline...)
	return r
}
func (b *BodyRef) spill(dir string) error {
	if len(b.inline) < 256<<10 {
		return nil
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	f, err := os.CreateTemp(dir, "body-*")
	if err != nil {
		return err
	}
	if _, err = f.Write(b.inline); err != nil {
		f.Close()
		os.Remove(f.Name())
		return err
	}
	if err = f.Close(); err != nil {
		return err
	}
	b.file = f.Name()
	b.inline = nil
	return nil
}
func (b *BodyRef) remove() {
	if b.file != "" {
		os.Remove(b.file)
	}
}
