package mitm

import (
	"crypto/tls"
	"errors"
	"sync"
)

// LeafCache 按域名签发并缓存叶子证书（LRU）。
type LeafCache struct {
	ca  *CA
	max int

	mu    sync.Mutex
	certs map[string]*tls.Certificate
	// TODO: LRU 链表；同一域名并发签发时用 singleflight 合并
}

func NewLeafCache(ca *CA, max int) *LeafCache {
	return &LeafCache{ca: ca, max: max, certs: make(map[string]*tls.Certificate)}
}

// Get 返回 host 对应的证书，不存在则签发：
// SAN 包含 host（IP 则写入 IPAddresses），有效期 ≤ 397 天（否则 Apple 设备不接受）。
func (c *LeafCache) Get(host string) (*tls.Certificate, error) {
	c.mu.Lock()
	cert, ok := c.certs[host]
	c.mu.Unlock()
	if ok {
		return cert, nil
	}
	// TODO: 签发
	return nil, errors.New("LeafCache.Get: not implemented")
}

// ServerTLSConfig 用于终结客户端 TLS。fallbackHost 是 CONNECT 目标，在客户端未发 SNI 时使用。
func (c *LeafCache) ServerTLSConfig(fallbackHost string, http2 bool) *tls.Config {
	protos := []string{"http/1.1"}
	if http2 {
		protos = []string{"h2", "http/1.1"}
	}
	return &tls.Config{
		NextProtos: protos,
		GetCertificate: func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
			host := hello.ServerName
			if host == "" {
				host = fallbackHost
			}
			return c.Get(host)
		},
	}
}
