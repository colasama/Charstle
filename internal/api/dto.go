package api

import (
	"charstle/internal/store"
	"encoding/base64"
	"io"
	"net/http"
	"strings"
)

func bodyInfo(b *store.BodyRef, h http.Header, id uint64, kind string, decode bool) map[string]any {
	mime := h.Get("Content-Type")
	typ := "binary"
	switch {
	case b.Size == 0:
		typ = "none"
	case strings.Contains(mime, "json"):
		typ = "json"
	case strings.Contains(mime, "html"):
		typ = "html"
	case strings.Contains(mime, "xml"):
		typ = "xml"
	case strings.Contains(mime, "x-www-form-urlencoded"):
		typ = "form"
	case strings.HasPrefix(mime, "image/"):
		typ = "image"
	case strings.HasPrefix(mime, "text/") || strings.Contains(mime, "javascript"):
		typ = "text"
	}
	v := map[string]any{"kind": typ, "mime": mime, "size": b.Size, "encoding": b.Encoding, "truncated": b.Truncated}
	var r io.ReadCloser
	var err error
	if decode {
		r, err = b.OpenDecoded()
	} else {
		r, err = b.Open()
		if b.Encoding != "" {
			typ = "binary"
			v["kind"] = typ
		}
	}
	if err == nil {
		defer r.Close()
		data, e := io.ReadAll(io.LimitReader(r, 2<<20+1))
		if e == nil {
			v["decodedSize"] = len(data)
			if typ != "binary" && typ != "image" {
				v["text"] = string(data[:min(len(data), 2<<20)])
			}
			if len(data) > 2<<20 {
				v["truncated"] = true
			}
		}
	}
	if typ == "image" {
		v["previewUrl"] = fmtBodyURL(id, kind)
	}
	return v
}
func detail(s *store.Session, decode bool) map[string]any {
	sum := s.Summary()
	timing := map[string]int64{}
	if !s.Timing.DNSStart.IsZero() && !s.Timing.DNSDone.IsZero() {
		timing["dns"] = s.Timing.DNSDone.Sub(s.Timing.DNSStart).Milliseconds()
	}
	if !s.Timing.WroteReq.IsZero() && !s.Timing.TTFB.IsZero() {
		timing["wait"] = s.Timing.TTFB.Sub(s.Timing.WroteReq).Milliseconds()
	}
	if !s.Timing.End.IsZero() && !s.Timing.TTFB.IsZero() {
		timing["receive"] = s.Timing.End.Sub(s.Timing.TTFB).Milliseconds()
	}
	frames := []map[string]any{}
	for _, f := range s.Frames {
		r, err := f.Data.Open()
		data := []byte{}
		if err == nil {
			data, _ = io.ReadAll(r)
			r.Close()
		}
		text, encoding := string(data), "utf8"
		if f.Opcode != "text" {
			text, encoding = base64.StdEncoding.EncodeToString(data), "base64"
		}
		frames = append(frames, map[string]any{"id": f.ID, "dir": f.Dir, "opcode": f.Opcode, "size": f.Size, "time": f.Time.UnixMilli(), "data": text, "encoding": encoding, "truncated": len(data) < f.Size})
	}
	return map[string]any{"id": sum.ID, "clientIp": sum.ClientIP, "method": sum.Method, "scheme": sum.Scheme, "host": sum.Host, "path": sum.Path, "proto": sum.Proto, "status": sum.Status, "type": sum.Type, "mime": sum.Mime, "reqSize": sum.ReqSize, "resSize": sum.ResSize, "startedAt": sum.StartedAt, "duration": sum.Duration, "state": sum.State, "hits": sum.Hits, "mocked": sum.Mocked, "remapped": sum.Remapped, "throttled": sum.Throttled, "url": s.URL, "httpVersion": s.Proto, "remoteAddr": s.Remote, "finalUrl": s.FinalURL, "reqHeaders": store.HeaderList(s.ReqHeader), "resHeaders": store.HeaderList(s.RespHeader), "reqBody": bodyInfo(&s.ReqBody, s.ReqHeader, s.ID, "req", decode), "resBody": bodyInfo(&s.RespBody, s.RespHeader, s.ID, "res", decode), "statusText": s.StatusText, "timing": timing, "tls": s.TLS, "ruleHits": append([]store.RuleHit{}, s.Hits...), "frames": frames, "error": s.Error}
}
