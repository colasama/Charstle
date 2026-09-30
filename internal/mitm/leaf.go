package mitm

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"net"
	"sync"
	"time"
)

type LeafCache struct {
	ca     *CA
	max    int
	mu     sync.Mutex
	certs  map[string]*tls.Certificate
	order  []string
	issuer string
}

func NewLeafCache(ca *CA, max int) *LeafCache {
	return &LeafCache{ca: ca, max: max, certs: map[string]*tls.Certificate{}}
}
func (c *LeafCache) Get(host string) (*tls.Certificate, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ca.mu.RLock()
	defer c.ca.mu.RUnlock()
	issuer := string(c.ca.Cert.Raw)
	if c.issuer != issuer {
		c.certs = map[string]*tls.Certificate{}
		c.order = nil
		c.issuer = issuer
	}
	if cert := c.certs[host]; cert != nil && time.Until(cert.Leaf.NotAfter) > time.Hour {
		return cert, nil
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	tmpl := &x509.Certificate{SerialNumber: serial(), Subject: pkix.Name{CommonName: host}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().AddDate(0, 0, 90), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}
	if ip := net.ParseIP(host); ip != nil {
		tmpl.IPAddresses = []net.IP{ip}
	} else {
		tmpl.DNSNames = []string{host}
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, c.ca.Cert, &key.PublicKey, c.ca.Key)
	if err != nil {
		return nil, err
	}
	leaf, _ := x509.ParseCertificate(der)
	cert := &tls.Certificate{Certificate: [][]byte{der, c.ca.Cert.Raw}, PrivateKey: key, Leaf: leaf}
	if len(c.order) >= max(c.max, 1) {
		delete(c.certs, c.order[0])
		c.order = c.order[1:]
	}
	c.order = append(c.order, host)
	c.certs[host] = cert
	return cert, nil
}
func (c *LeafCache) ServerTLSConfig(fallbackHost string, http2 bool) *tls.Config {
	protos := []string{"http/1.1"}
	if http2 {
		protos = []string{"h2", "http/1.1"}
	}
	return &tls.Config{MinVersion: tls.VersionTLS12, NextProtos: protos, GetCertificate: func(h *tls.ClientHelloInfo) (*tls.Certificate, error) {
		host := h.ServerName
		if host == "" {
			host = fallbackHost
		}
		return c.Get(host)
	}}
}
