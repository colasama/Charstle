import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ParsedRule } from "../../types";
import { Switch } from "../common/Controls";
import { cx } from "../../utils/format";
import { useUI } from "../../store/ui";

const kindLabel = {
  domain: "域名",
  wildcard: "通配",
  regex: "正则",
  prefix: "前缀",
};

/** 表格模式：展示解析后的规则。编辑仍然回写到文本（单一数据源）。 */
export function RuleTable({
  rules,
  groupId,
  onEdit,
  onDelete,
  onDisable,
}: {
  rules: ParsedRule[];
  groupId: string;
  onEdit: (line: number) => void;
  onDelete: (line: number) => void;
  onDisable: (line: number) => void;
}) {
  const openModal = useUI((s) => s.openModal);
  return (
    <div className="scroll grow">
      <table className="table rule-table">
        <thead>
          <tr>
            <th style={{ width: 44 }}>行</th>
            <th style={{ width: 44 }} />
            <th>匹配</th>
            <th>动作</th>
            <th>过滤条件</th>
            <th style={{ width: 64 }}>命中</th>
            <th className="col-actions" />
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className={cx(!r.enabled && "is-disabled")}>
              <td className="faint mono">{r.line}</td>
              <td>
                <Switch
                  size="sm"
                  on={r.enabled}
                  onChange={() => onDisable(r.line)}
                />
              </td>
              <td>
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge badge-outline">
                    {kindLabel[r.patternKind]}
                  </span>
                  <span className="pattern ellipsis">{r.pattern}</span>
                </div>
              </td>
              <td>
                <div className="actions">
                  {r.actions.map((a, i) => (
                    <span
                      key={i}
                      className="action-chip"
                      title={`${a.kind}://${a.value}`}
                    >
                      <b>{a.kind}</b>
                      <span>://{a.value}</span>
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <div className="actions">
                  {r.filters.map((f) => (
                    <span key={f} className="filter-chip">
                      {f}
                    </span>
                  ))}
                  {!r.filters.length && <span className="faint">—</span>}
                </div>
              </td>
              <td className="mono">{r.hitCount}</td>
              <td className="col-actions">
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  data-tip="编辑"
                  onClick={() => onEdit(r.line)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  data-tip="删除"
                  onClick={() => onDelete(r.line)}
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 12 }}>
        <button
          className="btn btn-sm"
          onClick={() => openModal({ type: "ruleForm", groupId })}
        >
          <Plus size={13} /> 添加规则
        </button>
      </div>
    </div>
  );
}
