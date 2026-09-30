import { useState } from 'react';
import { BookOpen, CircleAlert, CircleCheck, Code2, MoreHorizontal, Plus, Save, Table2, TriangleAlert } from 'lucide-react';
import { RuleGroupList, groupMenu } from '../components/rules/RuleGroupList';
import { RuleTable } from '../components/rules/RuleTable';
import { CheatSheet } from '../components/rules/CheatSheet';
import { CodeView } from '../components/common/CodeView';
import { Segmented, Switch } from '../components/common/Controls';
import { Dropdown } from '../components/common/Menu';
import { useUI } from '../store/ui';
import { mockDiagnostics, mockParsedRules, mockRuleGroups } from '../mock/data';
import { cx, formatRelative } from '../utils/format';

export function RulesPage() {
  // TODO(api): 规则组来自 /api/rules；编辑时调用 validateRules 做实时诊断
  const groups = mockRuleGroups;
  const [activeId, setActiveId] = useState(groups[0].id);
  const [mode, setMode] = useState<'text' | 'table'>('text');
  const [showHelp, setShowHelp] = useState(true);
  const openModal = useUI((s) => s.openModal);

  const group = groups.find((g) => g.id === activeId)!;
  const diagnostics = group.errorCount ? mockDiagnostics : [];
  const rules = mockParsedRules.filter((r) => r.groupId === group.id);
  const dirty = group.id === 'g1';

  return (
    <div className="workbench">
      <RuleGroupList groups={groups} activeId={activeId} onSelect={setActiveId} />

      <section className="wb-main">
        <div className="pane-header">
          <input className="input editor-title-input" defaultValue={group.name} key={group.id} />
          <Switch on={group.enabled} label="启用规则组" />
          <span className="muted text-xs">{group.enabled ? '已启用' : '已停用'}</span>
          {dirty && <span className="badge badge-warning">未保存</span>}
          <div className="spacer" />
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'text', label: '文本', icon: <Code2 size={13} /> },
              { value: 'table', label: '表格', icon: <Table2 size={13} /> },
            ]}
          />
          <button className={cx('btn btn-ghost btn-icon', showHelp && 'is-active')} data-tip="语法速查" onClick={() => setShowHelp((v) => !v)}>
            <BookOpen size={15} />
          </button>
          <button className="btn" onClick={() => openModal({ type: 'ruleForm', groupId: group.id })}>
            <Plus size={14} /> 添加规则
          </button>
          <button className="btn btn-primary" data-tip="Ctrl+S">
            <Save size={14} /> 保存
          </button>
          <Dropdown align="right" buttonClass="btn btn-ghost btn-icon" trigger={<MoreHorizontal size={15} />} items={groupMenu} />
        </div>

        {mode === 'text' ? <CodeView key={group.id} value={group.content} lang="rules" /> : <RuleTable rules={rules} groupId={group.id} />}

        {diagnostics.length > 0 && (
          <div className="diagnostics">
            {diagnostics.map((d, i) => (
              <div key={i} className="diag-row">
                {d.severity === 'error' ? <CircleAlert size={14} className="text-danger" /> : <TriangleAlert size={14} className="text-warning" />}
                <span className="grow">{d.message}</span>
                <span className="diag-pos">
                  第 {d.line} 行，第 {d.col} 列
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="pane-footer">
          {diagnostics.length ? (
            <span className="row text-danger" style={{ gap: 4 }}>
              <CircleAlert size={12} /> {diagnostics.length} 个错误，保存后错误行会被忽略
            </span>
          ) : (
            <span className="row text-success" style={{ gap: 4 }}>
              <CircleCheck size={12} /> 解析通过 · {group.ruleCount} 条规则
            </span>
          )}
          <div className="spacer" />
          <span>最后修改 {formatRelative(group.updatedAt)}</span>
        </div>
      </section>

      {showHelp && (
        <aside className="wb-aside">
          <div className="pane-header">
            <span className="pane-title">语法速查</span>
          </div>
          <CheatSheet />
        </aside>
      )}
    </div>
  );
}
