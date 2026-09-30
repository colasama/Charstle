package rules

import (
	"charstle/internal/flow"
	"fmt"
	"strings"
	"unicode"
)

func Parse(g Group) ([]*Rule, []Diagnostic) {
	out := []*Rule{}
	diags := []Diagnostic{}
	for i, line := range strings.Split(g.Content, "\n") {
		text := strings.TrimSpace(line)
		if text == "" || strings.HasPrefix(text, "#") {
			continue
		}
		r, err := parseLine(g, i+1, text)
		if err != nil {
			diags = append(diags, Diagnostic{Line: i + 1, Col: 1, Severity: "error", Message: err.Error()})
		} else {
			out = append(out, r)
		}
	}
	return out, diags
}

type condition struct{ key, value string }

func (f condition) Match(c *flow.Context) bool {
	switch f.key {
	case "method":
		return strings.EqualFold(c.Req.Method, f.value)
	case "clientIp":
		return c.ClientIP == f.value
	case "status":
		return c.Resp != nil && fmt.Sprint(c.Resp.StatusCode) == f.value
	}
	return false
}
func parseLine(g Group, line int, text string) (*Rule, error) {
	var tokens []string
	var tokenErr error
	if strings.HasPrefix(text, "/") {
		end := -1
		for i := 1; i < len(text); i++ {
			if text[i] == '/' && text[i-1] != '\\' && (i+1 == len(text) || text[i+1] == ' ' || text[i+1] == 'i') {
				end = i
				break
			}
		}
		if end < 0 {
			return nil, fmt.Errorf("unterminated regexp")
		}
		if end+1 < len(text) && text[end+1] == 'i' {
			end++
		}
		rest, err := tokensOf(text[end+1:])
		if err != nil {
			return nil, err
		}
		tokens = append([]string{text[:end+1]}, rest...)
	} else {
		tokens, tokenErr = tokensOf(text)
		if tokenErr != nil {
			return nil, tokenErr
		}
	}
	if len(tokens) < 2 {
		return nil, fmt.Errorf("expected pattern and action")
	}
	m, kind, err := Compile(tokens[0])
	if err != nil {
		return nil, err
	}
	r := &Rule{ID: fmt.Sprintf("%s:%d", g.ID, line), GroupID: g.ID, Group: g.Name, Line: line, Raw: text, Pattern: tokens[0], PatternKind: kind, Matcher: m}
	for _, token := range tokens[1:] {
		if strings.HasPrefix(token, "#") {
			break
		}
		if k, v, ok := strings.Cut(token, "://"); ok {
			if k == "http" || k == "https" {
				v = token
				k = "mapRemote"
			}
			a, err := newAction(k, v, nil)
			if err != nil {
				return nil, err
			}
			r.Actions = append(r.Actions, a)
			r.Specs = append(r.Specs, ActionSpec{Kind: k, Value: v})
		} else if k, v, ok := strings.Cut(token, "="); ok && (k == "method" || k == "clientIp" || k == "status") {
			r.Filters = append(r.Filters, condition{k, v})
			r.FilterText = append(r.FilterText, token)
		} else {
			return nil, fmt.Errorf("invalid action or filter: %s", token)
		}
	}
	if len(r.Actions) == 0 {
		return nil, fmt.Errorf("at least one action is required")
	}
	return r, nil
}

// Quotes group whitespace; backslashes remain literal for Windows file paths.
func tokensOf(text string) ([]string, error) {
	out := []string{}
	var b strings.Builder
	var quote rune
	for _, c := range text {
		if quote != 0 {
			if c == quote {
				quote = 0
			} else {
				b.WriteRune(c)
			}
			continue
		}
		if c == '\'' || c == '"' {
			quote = c
			continue
		}
		if unicode.IsSpace(c) {
			if b.Len() > 0 {
				out = append(out, b.String())
				b.Reset()
			}
		} else {
			b.WriteRune(c)
		}
	}
	if quote != 0 {
		return nil, fmt.Errorf("unterminated quoted value")
	}
	if b.Len() > 0 {
		out = append(out, b.String())
	}
	return out, nil
}
