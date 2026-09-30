package rules

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

type Matcher interface {
	Match(*url.URL) ([]string, bool)
}
type urlMatcher struct {
	re     *regexp.Regexp
	scheme bool
	prefix string
}

func (m *urlMatcher) Match(u *url.URL) ([]string, bool) {
	v := u.String()
	if !m.scheme {
		v = u.Host + u.RequestURI()
	}
	if m.re != nil {
		g := m.re.FindStringSubmatch(v)
		return g, g != nil
	}
	if strings.HasPrefix(v, m.prefix) {
		return []string{m.prefix, strings.TrimPrefix(v, m.prefix)}, true
	}
	return nil, false
}
func Compile(pattern string) (Matcher, PatternKind, error) {
	if pattern == "" {
		return nil, "", fmt.Errorf("empty pattern")
	}
	if strings.HasPrefix(pattern, "/") {
		i := strings.LastIndex(pattern, "/")
		if i <= 0 {
			return nil, "", fmt.Errorf("unterminated regexp")
		}
		expr := pattern[1:i]
		if pattern[i+1:] == "i" {
			expr = "(?i)" + expr
		} else if pattern[i+1:] != "" {
			return nil, "", fmt.Errorf("invalid regexp flags")
		}
		re, err := regexp.Compile(expr)
		return &urlMatcher{re: re, scheme: true}, PatternRegex, err
	}
	scheme := strings.Contains(pattern, "://")
	if strings.ContainsAny(pattern, "*?") {
		expr := regexp.QuoteMeta(pattern)
		expr = strings.ReplaceAll(expr, "\\*", ".*")
		expr = strings.ReplaceAll(expr, "\\?", ".")
		if !strings.Contains(strings.TrimPrefix(strings.TrimPrefix(pattern, "https://"), "http://"), "/") {
			expr += "(?:/.*)?"
		}
		re, err := regexp.Compile("(?i)^" + expr + "$")
		return &urlMatcher{re: re, scheme: scheme}, PatternWildcard, err
	}
	bare := strings.TrimPrefix(strings.TrimPrefix(pattern, "https://"), "http://")
	if !strings.Contains(bare, "/") {
		re, err := regexp.Compile("(?i)^" + regexp.QuoteMeta(pattern) + "(?::[0-9]+)?(?:/.*)?$")
		return &urlMatcher{re: re, scheme: scheme}, PatternDomain, err
	}
	return &urlMatcher{prefix: pattern, scheme: scheme}, PatternPrefix, nil
}
func Matches(pattern string, u *url.URL) bool {
	m, _, err := Compile(pattern)
	if err != nil {
		return false
	}
	_, ok := m.Match(u)
	return ok
}
