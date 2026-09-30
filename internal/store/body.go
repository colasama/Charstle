package store

import (
	"errors"
	"io"
)

// BodyRef 指向一段捕获到的 body：小 body 在内存，大 body 落盘到 spill 目录。
type BodyRef struct {
	Size      int64  // 原始（传输）字节数
	Truncated bool   // 超过捕获上限被截断
	Encoding  string // Content-Encoding
	inline    []byte
	file      string
}

// Open 返回原始字节。
func (b *BodyRef) Open() (io.ReadCloser, error) {
	// TODO: inline → bytes.Reader；file → os.Open
	return nil, errors.New("BodyRef.Open: not implemented")
}

// OpenDecoded 返回按 Content-Encoding 解码后的内容（gzip/br/zstd/deflate），仅用于展示。
func (b *BodyRef) OpenDecoded() (io.ReadCloser, error) {
	// TODO
	return nil, errors.New("BodyRef.OpenDecoded: not implemented")
}

// Capture 包装一个 body 流：转发给下游的同时把前 limit 字节写入 BodyRef。
// 必须是流式的——不能因为捕获而缓冲整个 body（SSE、大文件下载）。
type Capture struct {
	src   io.ReadCloser
	limit int64
	ref   *BodyRef
	// TODO: 内存缓冲 + 超过阈值后切换到临时文件
}

func NewCapture(src io.ReadCloser, limit int64, ref *BodyRef) *Capture {
	return &Capture{src: src, limit: limit, ref: ref}
}

func (c *Capture) Read(p []byte) (int, error) {
	n, err := c.src.Read(p)
	c.ref.Size += int64(n)
	// TODO: 把 p[:n] 追加到捕获缓冲（不超过 limit，超出则标记 Truncated）
	return n, err
}

func (c *Capture) Close() error {
	// TODO: 收尾（关闭临时文件、通知 store 更新会话）
	return c.src.Close()
}
