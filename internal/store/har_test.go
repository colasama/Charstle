package store

import (
	"bytes"
	"io"
	"net/http"
	"testing"
	"time"
)

func TestBinaryHARRoundTrip(t *testing.T) {
	raw := []byte{0, 255, 128, 13, 10}
	s := &Session{URL: "https://example.com/upload", Method: "POST", Proto: "HTTP/1.1", ReqHeader: http.Header{}, RespHeader: http.Header{}, ReqBody: Body(raw), RespBody: Body(raw), Status: 200, Timing: Timing{Start: time.Now(), End: time.Now()}}
	var buf bytes.Buffer
	if err := ExportHAR(&buf, []*Session{s}); err != nil {
		t.Fatal(err)
	}
	items, err := ImportHAR(&buf)
	if err != nil {
		t.Fatal(err)
	}
	for _, body := range []*BodyRef{&items[0].ReqBody, &items[0].RespBody} {
		r, _ := body.Open()
		b, _ := io.ReadAll(r)
		r.Close()
		if !bytes.Equal(raw, b) {
			t.Fatalf("%v", b)
		}
	}
}
