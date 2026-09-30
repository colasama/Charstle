package rules

import (
	"charstle/internal/flow"
	"charstle/internal/store"
	"sync/atomic"
)

type compiled struct{ ordered []*Rule }
type Engine struct {
	values *ValueStore
	snap   atomic.Pointer[compiled]
	groups atomic.Pointer[[]Group]
}

func NewEngine(v *ValueStore) *Engine {
	e := &Engine{values: v}
	e.snap.Store(&compiled{})
	gs := []Group{}
	e.groups.Store(&gs)
	return e
}
func (e *Engine) Load(groups []Group) map[string][]Diagnostic {
	diags := map[string][]Diagnostic{}
	c := &compiled{}
	copyGroups := append([]Group{}, groups...)
	for i, g := range copyGroups {
		rs, d := Parse(g)
		diags[g.ID] = d
		copyGroups[i].RuleCount = len(rs)
		copyGroups[i].ErrorCount = len(d)
		if !g.Enabled {
			continue
		}
		for _, r := range rs {
			r.Actions = nil
			for _, a := range r.Specs {
				action, _ := newAction(a.Kind, a.Value, e.values)
				r.Actions = append(r.Actions, action)
			}
		}
		c.ordered = append(c.ordered, rs...)
	}
	e.snap.Store(c)
	e.groups.Store(&copyGroups)
	return diags
}
func (e *Engine) Groups() []Group { return append([]Group{}, (*e.groups.Load())...) }
func (e *Engine) Validate(content string) []Diagnostic {
	_, d := Parse(Group{Content: content})
	return d
}
func (e *Engine) Apply(c *flow.Context, phase flow.Phase) error {
	done := map[string]bool{}
	u := c.Req.URL
	for _, r := range e.snap.Load().ordered {
		groups, ok := r.Matcher.Match(u)
		if !ok {
			continue
		}
		for _, f := range r.Filters {
			if !f.Match(c) {
				ok = false
				break
			}
		}
		if !ok {
			continue
		}
		for i, a := range r.Actions {
			preflight := phase == flow.PhaseRequest && a.Kind() == "cors" && c.Req.Method == "OPTIONS"
			if (a.Phase() != phase && !preflight) || done[a.Kind()] {
				continue
			}
			c.Match = groups
			c.Pattern = r.Pattern
			c.PatternKind = string(r.PatternKind)
			if err := a.Apply(c); err != nil {
				return err
			}
			if preflight {
				c.ShortCircuit = true
			}
			done[a.Kind()] = true
			r.HitCount.Add(1)
			c.Hit(store.RuleHit{RuleID: r.ID, Group: r.Group, Line: r.Line, Pattern: r.Pattern, Action: a.Kind(), Value: r.Specs[i].Value, Phase: phase.String()})
		}
	}
	return nil
}

func (e *Engine) Count(id string) int64 {
	for _, r := range e.snap.Load().ordered {
		if r.ID == id {
			return r.HitCount.Load()
		}
	}
	return 0
}
