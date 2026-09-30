package store

import (
	"errors"
	"io"
)

// ExportHAR 把会话写成 HAR 1.2。
func ExportHAR(w io.Writer, sessions []*Session) error {
	// TODO: https://w3c.github.io/web-performance/specs/HAR/Overview.html
	return errors.New("ExportHAR: not implemented")
}

// ImportHAR 读取 HAR 并转换成会话（只读展示，不可重放上游连接信息）。
func ImportHAR(r io.Reader) ([]*Session, error) {
	// TODO
	return nil, errors.New("ImportHAR: not implemented")
}
