import { FolderPlus, GripVertical, MoreHorizontal, Search, Copy, Pencil, Trash2, FileDown, FileUp } from 'lucide-react';
import type { RuleGroup } from '../../types';
import { Switch } from '../common/Controls';
import { Dropdown } from '../common/Menu';
import { cx } from '../../utils/format';

interface Props {
  groups: RuleGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function RuleGroupList({ groups, activeId, onSelect }: Props) {
  return (
    <aside className="wb-side">
      <div className="pane-header">
        <span className="pane-title grow">规则组</span>
        <button className="btn btn-ghost btn-icon btn-sm" data-tip="新建规则组">
          <FolderPlus size={15} />
        </button>
        <Dropdown
          align="right"
          buttonClass="btn btn-ghost btn-icon btn-sm"
          trigger={<MoreHorizontal size={15} />}
          items={[
            { label: '导入规则…', icon: <FileUp size={14} /> },
            { label: '导出全部规则…', icon: <FileDown size={14} /> },
          ]}
        />
      </div>
      <div className="pane-search">
        <div className="input-group">
          <Search size={13} />
          <input className="input input-sm" placeholder="搜索规则内容" />
        </div>
      </div>
      <div className="side-list scroll grow">
        {/* TODO: 拖拽排序（组的顺序决定匹配优先级） */}
        {groups.map((g) => (
          <div
            key={g.id}
            role="button"
            tabIndex={0}
            className={cx('side-item rule-group-item', g.id === activeId && 'is-active', !g.enabled && 'is-disabled')}
            onClick={() => onSelect(g.id)}
          >
            <GripVertical size={13} className="grip" />
            <span className="ellipsis grow">{g.name}</span>
            <span className="side-item-meta row" style={{ gap: 6 }}>
              {g.errorCount > 0 && <span className="badge badge-danger">{g.errorCount}</span>}
              <span>{g.ruleCount}</span>
              <Switch size="sm" on={g.enabled} label="启用" />
            </span>
          </div>
        ))}
      </div>
      <div className="pane-footer">
        <span>自上而下匹配，同类动作取第一条命中</span>
      </div>
    </aside>
  );
}

export const groupMenu = [
  { label: '重命名', icon: <Pencil size={14} /> },
  { label: '复制', icon: <Copy size={14} /> },
  { type: 'sep' as const },
  { label: '删除', icon: <Trash2 size={14} />, danger: true },
];
