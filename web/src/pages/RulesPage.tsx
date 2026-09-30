import { useSearchParams } from "react-router-dom";
import { RuleTable } from "../components/rules/RuleTable";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { CodeView } from "../components/common/CodeView";
import { Switch, EmptyState, Segmented } from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { CheatSheet } from "../components/rules/CheatSheet";
import { useData, perform } from "../store/data";
import { api } from "../api/client";
import { useUI } from "../store/ui";
import type { RuleGroup, RuleDiagnostic, ParsedRule } from "../types";
export function RulesPage() {
  const groups = useData((s) => s.groups);
  const [search] = useSearchParams();
  const groupName = search.get("group");
  const line = Number(search.get("line")) || undefined;
  const [active, setActive] = useState(
    groups.find((g) => g.name === groupName)?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const group = groups.find((g) => g.id === active) ?? groups[0];
  const create = async () => {
    const name = prompt("规则组名称");
    if (name?.trim()) {
      const g = await api.createRuleGroup(name);
      setActive(g.id);
    }
  };
  const move = async (id: string, delta: number) => {
    const ids = groups.map((g) => g.id);
    const i = ids.indexOf(id),
      j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await api.reorderRuleGroups(ids);
  };
  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          <span className="pane-title grow">规则组</span>
          <AsyncButton className="btn btn-sm" run={create}>
            <Plus size={14} />
            新建
          </AsyncButton>
        </div>
        <div className="pane-search">
          <input
            className="input"
            placeholder="搜索规则"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="side-list scroll grow">
          {groups
            .filter((g) => (g.name + g.content).includes(query))
            .map((g, i) => (
              <div
                key={g.id}
                className={
                  "side-item " + (g.id === group?.id ? "is-active" : "")
                }
              >
                <button
                  className="btn btn-ghost grow"
                  onClick={() => setActive(g.id)}
                >
                  {g.name}
                </button>
                <Switch
                  label="启用规则组"
                  on={g.enabled}
                  onChange={(enabled) =>
                    void perform(() => api.saveRuleGroup({ ...g, enabled }))
                  }
                />
                <AsyncButton
                  aria-label="上移"
                  className="btn btn-icon btn-sm"
                  disabled={i === 0}
                  run={() => move(g.id, -1)}
                >
                  <ArrowUp size={12} />
                </AsyncButton>
                <AsyncButton
                  aria-label="下移"
                  className="btn btn-icon btn-sm"
                  disabled={i === groups.length - 1}
                  run={() => move(g.id, 1)}
                >
                  <ArrowDown size={12} />
                </AsyncButton>
              </div>
            ))}
        </div>
        <div className="pane-footer">同类动作使用第一条匹配规则</div>
      </aside>
      {group ? (
        <RuleEditor
          key={group.id + group.updatedAt}
          group={group}
          line={line}
        />
      ) : (
        <EmptyState
          title="还没有规则组"
          desc="点击新建，添加域名匹配和改写动作"
        />
      )}
      <aside className="wb-aside">
        <div className="pane-header">语法速查</div>
        <CheatSheet
          onInsert={(text) =>
            window.dispatchEvent(
              new CustomEvent("charstle:insert-rule", { detail: text + "\n" }),
            )
          }
        />
      </aside>
    </div>
  );
}
function RuleEditor({ group, line }: { group: RuleGroup; line?: number }) {
  const [name, setName] = useState(group.name),
    [content, setContent] = useState(group.content);
  const [diagnostics, setDiagnostics] = useState<RuleDiagnostic[]>([]);
  const [parsed, setParsed] = useState<ParsedRule[]>([]);
  const [mode, setMode] = useState<"text" | "table">("text");
  const [focusLine, setFocusLine] = useState(line);
  useEffect(() => {
    let stopped = false;
    const timer = setTimeout(() => {
      api
        .parseRules({ ...group, content })
        .then((d) => {
          if (!stopped) {
            setDiagnostics(d.diagnostics);
            setParsed(d.rules);
          }
        })
        .catch(() => {});
    }, 300);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [content]);
  const save = async () => {
    await api.saveRuleGroup({ ...group, name, content });
  };
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        e.stopImmediatePropagation();
        void perform(save, "规则已保存");
      }
    };
    document.addEventListener("keydown", handle, true);
    return () => document.removeEventListener("keydown", handle, true);
  }, [name, content, group]);
  return (
    <section className="wb-main">
      <div className="pane-header">
        <input
          aria-label="规则组名称"
          className="input editor-title-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {(name !== group.name || content !== group.content) && (
          <span className="badge badge-warning">未保存</span>
        )}
        <div className="spacer" />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "text", label: "文本" },
            { value: "table", label: "表格" },
          ]}
        />
        <button
          className="btn"
          onClick={() =>
            useUI.getState().openModal({ type: "ruleForm", groupId: group.id })
          }
        >
          添加规则
        </button>
        <AsyncButton
          className="btn btn-primary"
          run={save}
          message="规则已保存"
        >
          <Save size={14} />
          保存
        </AsyncButton>
        <AsyncButton
          aria-label="删除规则组"
          className="btn btn-ghost"
          run={async () => {
            if (confirm("删除此规则组？")) await api.deleteRuleGroup(group.id);
          }}
        >
          <Trash2 size={14} />
        </AsyncButton>
      </div>
      <>
        {mode === "text" ? (
          <CodeView
            value={content}
            lang="rules"
            onChange={setContent}
            focusLine={focusLine}
          />
        ) : (
          <RuleTable
            rules={parsed}
            groupId={group.id}
            onEdit={(line) => {
              setFocusLine(line);
              setMode("text");
            }}
            onDelete={(line) =>
              setContent(
                content
                  .split("\n")
                  .filter((_, i) => i !== line - 1)
                  .join("\n"),
              )
            }
            onDisable={(line) =>
              setContent(
                content
                  .split("\n")
                  .map((v, i) => (i === line - 1 ? "# " + v : v))
                  .join("\n"),
              )
            }
          />
        )}
      </>
      {diagnostics.map((d, i) => (
        <div className="diag-row" key={i}>
          第 {d.line} 行：{d.message}
        </div>
      ))}
      <div className="pane-footer">
        {diagnostics.length ? "请修正规则后保存" : "语法检查通过"}
      </div>
    </section>
  );
}
