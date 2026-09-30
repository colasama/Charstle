package app

import (
	"charstle/internal/config"
	"charstle/internal/pipeline"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestComposeRedirectsAndCaptureLimit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/307":
			http.Redirect(w, r, "/echo", 307)
		case "/303":
			http.Redirect(w, r, "/echo", 303)
		case "/loop":
			http.Redirect(w, r, "/loop", 302)
		case "/large":
			io.WriteString(w, string(make([]byte, 8192)))
		default:
			b, _ := io.ReadAll(r.Body)
			fmt.Fprintf(w, "%s:%s", r.Method, b)
		}
	}))
	defer server.Close()
	cfg := config.Default(t.TempDir())
	cfg.Capture.BodyCaptureLimitKB = 1
	core, err := New(cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer core.Close()
	for _, tc := range []struct{ path, want string }{{"/307", "POST:payload"}, {"/303", "GET:"}} {
		s, err := core.Pipeline.Compose(pipeline.ComposeRequest{Method: "POST", URL: server.URL + tc.path, Body: "payload", FollowRedirects: true})
		if err != nil || s.Error != "" {
			t.Fatalf("%v %+v", err, s)
		}
		body, _ := s.RespBody.Open()
		b, _ := io.ReadAll(body)
		body.Close()
		if string(b) != tc.want {
			t.Fatalf("%s got %q", tc.path, b)
		}
	}
	s, err := core.Pipeline.Compose(pipeline.ComposeRequest{URL: server.URL + "/loop", FollowRedirects: true})
	if err != nil || s.State != "error" || s.Status != 502 {
		t.Fatalf("redirect loop: %+v %v", s, err)
	}
	s, err = core.Pipeline.Compose(pipeline.ComposeRequest{URL: server.URL + "/large"})
	if err != nil || s.RespSize != 8192 || !s.RespBody.Truncated {
		t.Fatalf("capture: %+v %v", s, err)
	}
}
