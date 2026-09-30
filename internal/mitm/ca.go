package mitm

import (
	"charstle/internal/config"
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

type CA struct {
	mu      sync.RWMutex
	Cert    *x509.Certificate
	Key     crypto.Signer
	CertPEM []byte
	Dir     string
}

func LoadOrCreateCA(dir string) (*CA, error) {
	ca := &CA{Dir: dir}
	cp := filepath.Join(dir, "charstle-ca.pem")
	kp := filepath.Join(dir, "charstle-ca.key")
	cert, ce := os.ReadFile(cp)
	key, ke := os.ReadFile(kp)
	// New key files contain the complete identity, committed by one atomic rename.
	// Continue to accept the original two-file layout.
	if ke == nil {
		if block, _ := pem.Decode(key); block != nil && block.Type == "CERTIFICATE" {
			cert, ce = pem.EncodeToMemory(block), nil
		}
	}
	if os.IsNotExist(ce) && os.IsNotExist(ke) {
		return ca, ca.Regenerate()
	}
	if ce != nil {
		return nil, ce
	}
	if ke != nil {
		return nil, ke
	}
	pair, err := tls.X509KeyPair(cert, key)
	if err != nil {
		return nil, err
	}
	ca.Cert, err = x509.ParseCertificate(pair.Certificate[0])
	if err != nil {
		return nil, err
	}
	if !ca.Cert.IsCA || time.Now().After(ca.Cert.NotAfter) {
		return nil, fmt.Errorf("invalid or expired CA; regenerate it explicitly")
	}
	ca.Key = pair.PrivateKey.(crypto.Signer)
	ca.CertPEM = cert
	if err = config.WriteFile(cp, cert, 0644); err != nil {
		return nil, err
	}
	return ca, nil
}
func serial() *big.Int { n, _ := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128)); return n }
func (ca *CA) Regenerate() error {
	ca.mu.Lock()
	defer ca.mu.Unlock()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return err
	}
	tmpl := &x509.Certificate{SerialNumber: serial(), Subject: pkix.Name{CommonName: "Charstle Root CA", Organization: []string{"Charstle"}}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().AddDate(10, 0, 0), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageCRLSign}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return err
	}
	kb, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return err
	}
	cp := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	identity := append(append([]byte{}, cp...), pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: kb})...)
	if err = config.WriteFile(filepath.Join(ca.Dir, "charstle-ca.key"), identity, 0600); err != nil {
		return err
	}
	ca.Cert, _ = x509.ParseCertificate(der)
	ca.Key = key
	ca.CertPEM = cp
	return config.WriteFile(filepath.Join(ca.Dir, "charstle-ca.pem"), cp, 0644)
}
func (ca *CA) Fingerprint() string {
	sum := sha256.Sum256(ca.DER())
	h := strings.ToUpper(hex.EncodeToString(sum[:]))
	var parts []string
	for i := 0; i < len(h); i += 2 {
		parts = append(parts, h[i:i+2])
	}
	return strings.Join(parts, ":")
}
func (ca *CA) DER() []byte {
	ca.mu.RLock()
	defer ca.mu.RUnlock()
	if ca.Cert == nil {
		return nil
	}
	return append([]byte(nil), ca.Cert.Raw...)
}
func (ca *CA) PEM() []byte {
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: ca.DER()})
}
func (ca *CA) Certificate() *x509.Certificate { ca.mu.RLock(); defer ca.mu.RUnlock(); return ca.Cert }
func (ca *CA) MobileConfig() ([]byte, error) {
	der := ca.DER()
	uuid := func(salt string) string {
		sum := sha256.Sum256(append(append([]byte{}, der...), salt...))
		sum[6] = (sum[6] & 15) | 0x40
		sum[8] = (sum[8] & 63) | 0x80
		return fmt.Sprintf("%x-%x-%x-%x-%x", sum[:4], sum[4:6], sum[6:8], sum[8:10], sum[10:16])
	}
	return []byte(fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>PayloadType</key><string>Configuration</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>pro.charstle.ca</string><key>PayloadUUID</key><string>%s</string><key>PayloadDisplayName</key><string>Charstle Root CA</string><key>PayloadContent</key><array><dict><key>PayloadType</key><string>com.apple.security.root</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>pro.charstle.ca.cert</string><key>PayloadUUID</key><string>%s</string><key>PayloadDisplayName</key><string>Charstle Root CA</string><key>PayloadContent</key><data>%s</data></dict></array></dict></plist>`, uuid("profile"), uuid("certificate"), base64.StdEncoding.EncodeToString(der))), nil
}
func (ca *CA) InstallToSystem() error {
	path := filepath.Join(ca.Dir, "charstle-ca.pem")
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("certutil", "-addstore", "-user", "Root", path)
	case "darwin":
		home, _ := os.UserHomeDir()
		cmd = exec.Command("security", "add-trusted-cert", "-r", "trustRoot", "-k", filepath.Join(home, "Library/Keychains/login.keychain-db"), path)
	default:
		if err := config.WriteFile("/usr/local/share/ca-certificates/charstle.crt", ca.PEM(), 0644); err != nil {
			return fmt.Errorf("install CA as root: %w", err)
		}
		cmd = exec.Command("update-ca-certificates")
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, out)
	}
	return nil
}
func (ca *CA) InstalledOnSystem() bool {
	pool, err := x509.SystemCertPool()
	if err != nil {
		return false
	}
	_, err = ca.Certificate().Verify(x509.VerifyOptions{Roots: pool})
	return err == nil
}
