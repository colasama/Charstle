package rules

import (
	"sync/atomic"

	"charstle/internal/flow"
)

// compiled 是一次编译后的只读规则快照；规则变更时整体替换，匹配过程无锁。
type compiled struct {
	ordered []*Rule      // 全部规则，按组顺序 + 行号
	domains *domainIndex // 纯域名规则索引
	scan    []*Rule      // 通配 / 正则规则
}

type Engine struct {
	values *ValueStore
	snap   atomic.Pointer[compiled]
	groups atomic.Pointer[[]Group]
}

func NewEngine(values *ValueStore) *Engine {
	e := &Engine{values: values}
	e.snap.Store(&compiled{domains: &domainIndex{}})
	empty := []Group{}
	e.groups.Store(&empty)
	return e
}

// Load 解析所有启用的规则组并原子替换快照，返回每个组的诊断信息。
func (e *Engine) Load(groups []Group) map[string][]Diagnostic {
	diags := make(map[string][]Diagnostic)
	c := &compiled{domains: &domainIndex{}}
	for _, g := range groups {
		rs, d := Parse(g)
		diags[g.ID] = d
		if !g.Enabled {
			continue
		}
		c.ordered = append(c.ordered, rs...)
		// TODO: 纯域名规则放入 c.domains，其余放入 c.scan
	}
	e.snap.Store(c)
	e.groups.Store(&groups)
	return diags
}

func (e *Engine) Groups() []Group { return *e.groups.Load() }

// Validate 只解析不生效，用于编辑器实时诊断。
func (e *Engine) Validate(content string) []Diagnostic {
	_, d := Parse(Group{Content: content})
	return d
}

// Apply 在指定阶段执行所有命中规则的对应动作。
// 同种 action 只执行第一条命中，不同种可叠加。
func (e *Engine) Apply(ctx *flow.Context, phase flow.Phase) error {
	// TODO:
	//   c := e.snap.Load()
	//   候选 = c.domains.lookup(host) ∪ c.scan，按原始顺序合并
	//   for 每条规则: Matcher.Match(ctx.Target) → Filters 全部通过
	//     → 对 phase 匹配的 action：若该 kind 尚未执行，则 ctx.Match = groups; action.Apply(ctx); ctx.Hit(...)
	return nil
}
