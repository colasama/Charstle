import { useState } from 'react';
import { Braces, Copy, Link2, Plus, Save, Search, Trash2, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CodeView, type CodeLang } from '../components/common/CodeView';
import { EmptyState } from '../components/common/Controls';
import { mockValues } from '../mock/data';
import type { ValueType } from '../types';
import { cx, formatRelative } from '../utils/format';

const langOf: Record<ValueType, CodeLang> = { json: 'json', text: 'text', headers: 'text', html: 'html' };

export function ValuesPage() {
  // TODO(api): /api/values
  const values = mockValues;
  const [activeKey, setActiveKey] = useState(values[0]?.key);
  const item = values.find((v) => v.key === activeKey);

  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          <span className="pane-title grow">Values</span>
          <button className="btn btn-ghost btn-icon btn-sm" data-tip="新建">
            <Plus size={15} />
          </button>
        </div>
        <div className="pane-search">
          <div className="input-group">
            <Search size={13} />
            <input className="input input-sm" placeholder="搜索 key" />
          </div>
        </div>
        <div className="side-list scroll grow">
          {values.map((v) => (
            <button key={v.key} className={cx('side-item', v.key === activeKey && 'is-active')} onClick={() => setActiveKey(v.key)}>
              <span className={`value-type t-${v.type}`}>{v.type === 'headers' ? 'HDR' : v.type}</span>
              <span className="ellipsis grow mono">{v.key}</span>
              {v.usedBy.length > 0 && <span className="side-item-meta">{v.usedBy.length}</span>}
            </button>
          ))}
        </div>
        <div className="pane-footer">
          在规则中用 <code>{'{key}'}</code> 引用
        </div>
      </aside>

      <section className="wb-main">
        {item ? (
          <>
            <div className="pane-header">
              <span className="muted mono">{'{'}</span>
              <input className="input editor-title-input mono" defaultValue={item.key} key={item.key} />
              <span className="muted mono">{'}'}</span>
              <select className="select input-sm" style={{ width: 110 }} defaultValue={item.type} key={`${item.key}-type`}>
                <option value="json">JSON</option>
                <option value="text">Text</option>
                <option value="headers">Headers</option>
                <option value="html">HTML</option>
              </select>
              <div className="spacer" />
              {item.type === 'json' && (
                <button className="btn btn-ghost btn-sm" data-tip="格式化 JSON">
                  <WandSparkles size={13} /> 格式化
                </button>
              )}
              <button className="btn btn-ghost btn-icon" data-tip="复制引用">
                <Copy size={15} />
              </button>
              <button className="btn btn-ghost btn-icon" data-tip="删除">
                <Trash2 size={15} />
              </button>
              <button className="btn btn-primary">
                <Save size={14} /> 保存
              </button>
            </div>
            <CodeView key={item.key} value={item.content} lang={langOf[item.type]} />
            <div className="pane-footer">
              <Link2 size={12} />
              {item.usedBy.length ? (
                <span className="used-by">
                  被引用：
                  {item.usedBy.map((u) => (
                    <Link key={u} to="/rules" className="badge badge-purple">
                      {u}
                    </Link>
                  ))}
                </span>
              ) : (
                <span>未被任何规则引用</span>
              )}
              <div className="spacer" />
              {item.type === 'headers' && <span>每行一个 <code>name: value</code>，值为空表示删除该头</span>}
              <span>修改于 {formatRelative(item.updatedAt)}</span>
            </div>
          </>
        ) : (
          <EmptyState icon={<Braces size={20} />} title="还没有 Value" desc="Value 是可复用的数据片段，可在规则中通过 {key} 引用作为 Mock 响应、请求头等" />
        )}
      </section>
    </div>
  );
}
