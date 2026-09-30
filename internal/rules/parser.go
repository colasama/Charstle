package rules

import (
	"bufio"
	"strings"
)

// Parse 把一个规则组的文本解析为规则列表。出错的行跳过并记录诊断，不影响其它行。
func Parse(g Group) ([]*Rule, []Diagnostic) {
	var (
		out   []*Rule
		diags []Diagnostic
	)
	sc := bufio.NewScanner(strings.NewReader(g.Content))
	line := 0
	for sc.Scan() {
		line++
		text := strings.TrimSpace(sc.Text())
		if text == "" || strings.HasPrefix(text, "#") {
			continue
		}
		r, d := parseLine(g, line, text)
		diags = append(diags, d...)
		if r != nil {
			out = append(out, r)
		}
	}
	return out, diags
}

func parseLine(g Group, line int, text string) (*Rule, []Diagnostic) {
	// TODO:
	//   1. 按空白切分（注意正则 pattern 中可能包含空格 → 以 / 开头时找配对的结尾 /）
	//   2. 第一个 token 为 pattern → 判断 PatternKind，构造 Matcher
	//   3. 形如 kind://value 的 token → newAction(kind, value)；未知 kind 报错并给出拼写建议
	//      特例：以 http:// 或 https:// 开头的 token 视为 mapRemote
	//   4. 形如 key=value 的 token → newFilter
	_ = text
	return nil, []Diagnostic{{Line: line, Col: 1, Severity: "warning", Message: "parser not implemented"}}
}
