package rules

import (
	"charstle/internal/flow"
	"charstle/internal/store"
	"net/http"
	"net/url"
	"testing"
)

func TestMatchingAndPriority(t *testing.T) {
	cases := []struct {
		p, u string
		want bool
	}{{"example.com", "https://example.com/a", true}, {"example.com", "https://notexample.com/", false}, {"*.example.com", "https://api.example.com/a", true}, {"example.com/a", "https://example.com/abc", true}, {"/^https:\\/\\/example\\.com\\/([0-9]+)$/", "https://example.com/42", true}}
	for _, tc := range cases {
		u, _ := url.Parse(tc.u)
		if got := Matches(tc.p, u); got != tc.want {
			t.Errorf("%s %s: %v", tc.p, tc.u, got)
		}
	}
	values := NewValueStore(t.TempDir())
	values.Put(Value{Key: "one", Type: ValueText, Content: "first"})
	engine := NewEngine(values)
	d := engine.Load([]Group{{ID: "g", Enabled: true, Content: "example.com mock://{one}\nexample.com mock://second\nexample.com delay://1 method=POST"}})
	if len(d["g"]) > 0 {
		t.Fatal(d)
	}
	req, _ := http.NewRequest("GET", "http://example.com/", nil)
	c := &flow.Context{Req: req, Target: req.URL, Session: &store.Session{}}
	if err := engine.Apply(c, flow.PhaseRequest); err != nil {
		t.Fatal(err)
	}
	if !c.ShortCircuit || len(c.Session.Hits) != 1 {
		t.Fatalf("%+v", c)
	}
	c.Resp.Body.Close()
	if len(engine.Validate("x unknown://y")) != 1 {
		t.Fatal("unknown action accepted")
	}
}
