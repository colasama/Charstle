// Package rules 负责规则文本的解析、匹配与动作执行。
//
// 规则语法（一行一条）：
//
//	# 注释
//	<pattern> <action>://<value> [<action>://<value> ...] [key=value ...]
//
// 匹配语义：规则组按顺序、组内自上而下；同一种 action 只取第一条命中，
// 不同种 action 可以叠加。
package rules

import (
	"charstle/internal/flow"
)

type PatternKind string

const (
	PatternDomain   PatternKind = "domain"   // www.example.com
	PatternWildcard PatternKind = "wildcard" // *.example.com / a.com/api/*
	PatternRegex    PatternKind = "regex"    // /^https:\/\/a\.com\/(\d+)$/
	PatternPrefix   PatternKind = "prefix"   // a.com/v1/
)

// Action 是规则动作的统一接口。每种 kind 一个实现，见 actions.go。
type Action interface {
	Kind() string
	Phase() flow.Phase
	Apply(ctx *flow.Context) error
}

// Filter 是规则行尾的附加条件，如 method=POST、clientIp=192.168.1.42。
type Filter interface {
	Match(ctx *flow.Context) bool
}

type Rule struct {
	ID      string
	GroupID string
	Group   string // 组名，用于展示
	Line    int
	Raw     string

	Pattern     string
	PatternKind PatternKind
	Matcher     Matcher
	Actions     []Action
	Filters     []Filter
}

type Group struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
	Content string `json:"content"`
}

type Diagnostic struct {
	Line     int    `json:"line"`
	Col      int    `json:"col"`
	Severity string `json:"severity"` // error | warning
	Message  string `json:"message"`
}
