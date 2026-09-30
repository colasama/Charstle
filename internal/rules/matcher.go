package rules

import (
	"net/url"
	"regexp"
)

// Matcher 判断一个 URL 是否命中 pattern，命中时返回正则分组（非正则 pattern 返回 [整个 URL]）。
type Matcher interface {
	Match(u *url.URL) (groups []string, ok bool)
}

// domainMatcher：精确域名，或带路径前缀（a.com/v1/）。
type domainMatcher struct {
	host       string
	pathPrefix string
}

func (m *domainMatcher) Match(u *url.URL) ([]string, bool) {
	// TODO
	return nil, false
}

// wildcardMatcher：*.a.com、a.com/api/*
type wildcardMatcher struct {
	re *regexp.Regexp // 编译后的等价正则
}

func (m *wildcardMatcher) Match(u *url.URL) ([]string, bool) {
	// TODO
	return nil, false
}

type regexMatcher struct {
	re *regexp.Regexp
}

func (m *regexMatcher) Match(u *url.URL) ([]string, bool) {
	g := m.re.FindStringSubmatch(u.String())
	return g, g != nil
}

// domainIndex 是纯域名规则的反向域名 trie（com → example → api），
// 让大部分规则 O(域名层级) 查找，通配/正则规则才需要线性扫描。
type domainIndex struct {
	children map[string]*domainIndex
	rules    []*Rule // 按原始顺序
}

func (d *domainIndex) insert(host string, r *Rule) {
	// TODO
}

func (d *domainIndex) lookup(host string) []*Rule {
	// TODO
	return nil
}
