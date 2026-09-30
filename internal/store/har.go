package store

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

type HARHeader struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func HeaderList(h http.Header) []HARHeader {
	out := []HARHeader{}
	for k, vs := range h {
		for _, v := range vs {
			out = append(out, HARHeader{k, v})
		}
	}
	return out
}
func HeaderMap(h []HARHeader) http.Header {
	out := make(http.Header)
	for _, v := range h {
		out.Add(v.Name, v.Value)
	}
	return out
}

type harMessage struct {
	Method      string      `json:"method,omitempty"`
	URL         string      `json:"url,omitempty"`
	HTTPVersion string      `json:"httpVersion"`
	Headers     []HARHeader `json:"headers"`
	Cookies     []any       `json:"cookies"`
	Query       []HARHeader `json:"queryString,omitempty"`
	HeadersSize int         `json:"headersSize"`
	BodySize    int64       `json:"bodySize"`
	PostData    *harContent `json:"postData,omitempty"`
	Status      int         `json:"status,omitempty"`
	StatusText  string      `json:"statusText,omitempty"`
	Content     *harContent `json:"content,omitempty"`
	Redirect    string      `json:"redirectURL"`
}
type harContent struct {
	Size            int64  `json:"size"`
	MIME            string `json:"mimeType"`
	Text            string `json:"text"`
	Encoding        string `json:"encoding,omitempty"`
	PrivateEncoding string `json:"_encoding,omitempty"`
}
type harEntry struct {
	Started  time.Time          `json:"startedDateTime"`
	Time     float64            `json:"time"`
	Request  harMessage         `json:"request"`
	Response harMessage         `json:"response"`
	Timings  map[string]float64 `json:"timings"`
	ClientIP string             `json:"_clientIp,omitempty"`
}
type harFile struct {
	Log struct {
		Version string            `json:"version"`
		Creator map[string]string `json:"creator"`
		Entries []harEntry        `json:"entries"`
	} `json:"log"`
}

func ExportHAR(w io.Writer, sessions []*Session) error {
	doc := harFile{}
	doc.Log.Version = "1.2"
	doc.Log.Creator = map[string]string{"name": "Charstle", "version": "0.1.0"}
	doc.Log.Entries = []harEntry{}
	for _, s := range sessions {
		body := func(b *BodyRef, h http.Header) (*harContent, error) {
			r, err := b.OpenDecoded()
			if err != nil {
				return nil, err
			}
			defer r.Close()
			data, err := io.ReadAll(r)
			if err != nil {
				return nil, err
			}
			return &harContent{Size: int64(len(data)), MIME: h.Get("Content-Type"), Text: base64.StdEncoding.EncodeToString(data), Encoding: "base64"}, nil
		}
		req, err := body(&s.ReqBody, s.ReqHeader)
		if err != nil {
			return err
		}
		res, err := body(&s.RespBody, s.RespHeader)
		if err != nil {
			return err
		}
		u, _ := url.Parse(s.URL)
		query := []HARHeader{}
		if u != nil {
			for k, vs := range u.Query() {
				for _, v := range vs {
					query = append(query, HARHeader{k, v})
				}
			}
		}
		duration := float64(s.Summary().Duration)
		// HAR postData has no standard encoding field; use an extension for binary data.
		raw, err := s.ReqBody.Open()
		if err != nil {
			return err
		}
		data, err := io.ReadAll(raw)
		raw.Close()
		if err != nil {
			return err
		}
		req.Text = string(data)
		req.Encoding = ""
		if !utf8.Valid(data) {
			req.Text = base64.StdEncoding.EncodeToString(data)
			req.PrivateEncoding = "base64"
		}
		doc.Log.Entries = append(doc.Log.Entries, harEntry{Started: s.Timing.Start, Time: duration, ClientIP: s.ClientIP, Request: harMessage{Method: s.Method, URL: s.URL, HTTPVersion: s.Proto, Headers: HeaderList(s.ReqHeader), Cookies: []any{}, Query: query, HeadersSize: -1, BodySize: s.ReqSize, PostData: req}, Response: harMessage{Status: s.Status, StatusText: s.StatusText, HTTPVersion: s.Proto, Headers: HeaderList(s.RespHeader), Cookies: []any{}, HeadersSize: -1, BodySize: s.RespSize, Content: res, Redirect: s.RespHeader.Get("Location")}, Timings: map[string]float64{"send": 0, "wait": duration, "receive": 0}})
	}
	return json.NewEncoder(w).Encode(doc)
}
func ImportHAR(r io.Reader) ([]*Session, error) {
	var doc harFile
	if err := json.NewDecoder(r).Decode(&doc); err != nil {
		return nil, err
	}
	if doc.Log.Version != "1.2" {
		return nil, fmt.Errorf("expected HAR 1.2")
	}
	if len(doc.Log.Entries) > 10000 {
		return nil, fmt.Errorf("HAR has too many entries")
	}
	out := []*Session{}
	for _, e := range doc.Log.Entries {
		u, err := url.Parse(e.Request.URL)
		if err != nil || u.Host == "" {
			return nil, fmt.Errorf("invalid HAR URL")
		}
		if e.Time < 0 || e.Time > 86400000 {
			return nil, fmt.Errorf("invalid HAR duration")
		}
		s := &Session{ClientIP: e.ClientIP, Method: e.Request.Method, URL: u.String(), Host: u.Host, Scheme: u.Scheme, Path: u.RequestURI(), Proto: e.Request.HTTPVersion, ReqHeader: HeaderMap(e.Request.Headers), RespHeader: HeaderMap(e.Response.Headers), Status: e.Response.Status, StatusText: e.Response.StatusText, State: StateDone, Timing: Timing{Start: e.Started, End: e.Started.Add(time.Duration(e.Time * float64(time.Millisecond)))}}
		decode := func(c *harContent) ([]byte, error) {
			if c == nil {
				return nil, nil
			}
			if c.Encoding == "base64" || c.PrivateEncoding == "base64" {
				return base64.StdEncoding.DecodeString(c.Text)
			}
			return []byte(c.Text), nil
		}
		req, err := decode(e.Request.PostData)
		if err != nil {
			return nil, err
		}
		res, err := decode(e.Response.Content)
		if err != nil {
			return nil, err
		}
		s.ReqBody = Body(req)
		s.RespBody = Body(res)
		s.ReqSize = int64(len(req))
		s.RespSize = int64(len(res))
		s.RespHeader.Del("Content-Encoding")
		s.RespHeader.Del("Content-Length")
		s.ReqBody.Encoding = s.ReqHeader.Get("Content-Encoding")
		out = append(out, s)
	}
	return out, nil
}
func Curl(s *Session) (string, error) {
	quote := func(v string) string { return "'" + strings.ReplaceAll(v, "'", "'\\''") + "'" }
	parts := []string{"curl", "-X", quote(s.Method), quote(s.URL)}
	for _, h := range HeaderList(s.ReqHeader) {
		if strings.EqualFold(h.Name, "Content-Length") {
			continue
		}
		parts = append(parts, "-H", quote(h.Name+": "+h.Value))
	}
	if s.ReqBody.Size > 0 {
		if s.ReqBody.Truncated {
			return "", fmt.Errorf("request body is truncated")
		}
		r, err := s.ReqBody.Open()
		if err != nil {
			return "", err
		}
		defer r.Close()
		body, err := io.ReadAll(r)
		if err != nil {
			return "", err
		}
		parts = append(parts, "--data-binary", quote(string(body)))
	}
	return strings.Join(parts, " "), nil
}
