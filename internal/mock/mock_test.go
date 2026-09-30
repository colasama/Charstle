package mock

import (
	"charstle/internal/flow"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSandboxTimeoutAndLocalRoot(t *testing.T) {
	req, _ := http.NewRequest("GET", "http://example.com/", nil)
	ctx := &flow.Context{Req: req, Target: req.URL}
	r := NewRunner()
	r.Timeout = 20 * time.Millisecond
	r.Source = func(string) (string, error) { return "exports.handle=function(){while(true){}}", nil }
	if _, err := r.Run("loop", ctx); err == nil {
		t.Fatal("unbounded script")
	}
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "secret"), []byte("secret"), 0600)
	root := filepath.Join(dir, "public")
	os.Mkdir(root, 0700)
	ctx.Target.Path = "/../secret"
	if resp, err := FileResponse(root, ctx); err == nil {
		resp.Body.Close()
		t.Fatal("path escaped root")
	}
	r.Source = func(string) (string, error) {
		return "exports.handle=function(){return {body:typeof require+':'+typeof fetch}}", nil
	}
	result, err := r.Run("sandbox", ctx)
	if err != nil || !strings.Contains(string(result.Body), "undefined:undefined") {
		t.Fatal(result, err)
	}
}
