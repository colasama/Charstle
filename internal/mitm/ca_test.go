package mitm

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIdentityReloadAndRegeneration(t *testing.T) {
	dir := t.TempDir()
	ca, err := LoadOrCreateCA(dir)
	if err != nil {
		t.Fatal(err)
	}
	cache := NewLeafCache(ca, 2)
	leaf, err := cache.Get("example.com")
	if err != nil {
		t.Fatal(err)
	}
	if err = leaf.Leaf.CheckSignatureFrom(ca.Certificate()); err != nil {
		t.Fatal(err)
	}
	// A stale certificate export must not corrupt the authoritative identity.
	if err = os.WriteFile(filepath.Join(dir, "charstle-ca.pem"), []byte("interrupted export"), 0600); err != nil {
		t.Fatal(err)
	}
	again, err := LoadOrCreateCA(dir)
	if err != nil {
		t.Fatal(err)
	}
	if again.Fingerprint() != ca.Fingerprint() {
		t.Fatal("identity changed")
	}
	if err = ca.Regenerate(); err != nil {
		t.Fatal(err)
	}
	replacement, err := cache.Get("example.com")
	if err != nil {
		t.Fatal(err)
	}
	if replacement == leaf {
		t.Fatal("stale leaf after regeneration")
	}
	if err = replacement.Leaf.CheckSignatureFrom(ca.Certificate()); err != nil {
		t.Fatal(err)
	}
}
