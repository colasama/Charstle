// Package mitm 管理根证书与按域名动态签发的叶子证书，用于 HTTPS 解密。
package mitm

import (
	"crypto"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"errors"
	"strings"
)

// CA 是本地根证书。私钥文件权限必须为 0600。
type CA struct {
	Cert    *x509.Certificate
	Key     crypto.Signer
	CertPEM []byte
	Dir     string
}

// LoadOrCreateCA 从 dir 读取 charstle-ca.pem / charstle-ca.key，不存在则生成：
// ECDSA P-256，有效期 10 年，Subject: CN=Charstle Root CA, O=Charstle。
func LoadOrCreateCA(dir string) (*CA, error) {
	// TODO
	return &CA{Dir: dir}, nil
}

// Regenerate 生成新的根证书并覆盖旧文件。所有设备都需要重新安装。
func (ca *CA) Regenerate() error {
	// TODO
	return errors.New("CA.Regenerate: not implemented")
}

// Fingerprint 返回 SHA-256 指纹（AA:BB:…）。
func (ca *CA) Fingerprint() string {
	if ca.Cert == nil {
		return ""
	}
	sum := sha256.Sum256(ca.Cert.Raw)
	h := strings.ToUpper(hex.EncodeToString(sum[:]))
	var b strings.Builder
	for i := 0; i < len(h); i += 2 {
		if i > 0 {
			b.WriteByte(':')
		}
		b.WriteString(h[i : i+2])
	}
	return b.String()
}

// DER 返回 .crt 下载用的 DER 编码。
func (ca *CA) DER() []byte {
	if ca.Cert == nil {
		return nil
	}
	return ca.Cert.Raw
}

// MobileConfig 生成 iOS 描述文件（.mobileconfig，内含 PKCS#1 证书 payload）。
func (ca *CA) MobileConfig() ([]byte, error) {
	// TODO
	return nil, errors.New("CA.MobileConfig: not implemented")
}

// InstallToSystem 把根证书安装到本机信任库：
//
//	Windows: certutil -addstore -user Root <file>
//	macOS:   security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db <file>
//	Linux:   复制到 /usr/local/share/ca-certificates 并 update-ca-certificates（需要 root）
func (ca *CA) InstallToSystem() error {
	// TODO
	return errors.New("CA.InstallToSystem: not implemented")
}

// InstalledOnSystem 检查本机是否已信任该根证书。
func (ca *CA) InstalledOnSystem() bool {
	// TODO: x509.SystemCertPool() 中查找
	return false
}
