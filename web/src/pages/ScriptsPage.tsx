import { useState } from 'react';
import { FileCode2, Play, Plus, Save, Search, Trash2 } from 'lucide-react';
import { CodeView } from '../components/common/CodeView';
import { Tabs } from '../components/common/Tabs';
import { KeyValueTable } from '../components/common/KeyValueTable';
import { mockScripts } from '../mock/data';
import type { ScriptRunResult } from '../types';
import { cx, formatRelative } from '../utils/format';

// 仅展示用的运行结果
const sampleResult: ScriptRunResult = {
  ok: true,
  duration: 3.2,
  status: 200,
  headers: { 'content-type': 'application/json', 'x-mock-by': 'order.js' },
  body: JSON.stringify({ code: 0, data: { id: '10086', amount: 57.31, status: 'SHIPPED', uid: '48213' } }, null, 2),
  logs: [
    { level: 'log', text: 'match: ["/v1/order/10086", "10086"]' },
    { level: 'warn', text: 'query.uid 使用了字符串类型' },
  ],
};

export function ScriptsPage() {
  // TODO(api): /api/scripts；运行测试调用 api.runScript
  const scripts = mockScripts;
  const [active, setActive] = useState(scripts[0].name);
  const [outTab, setOutTab] = useState<'body' | 'headers' | 'logs'>('body');
  const script = scripts.find((s) => s.name === active)!;
  const result = sampleResult;

  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          <span className="pane-title grow">Mock 脚本</span>
          <button className="btn btn-ghost btn-icon btn-sm" data-tip="新建脚本">
            <Plus size={15} />
          </button>
        </div>
        <div className="pane-search">
          <div className="input-group">
            <Search size={13} />
            <input className="input input-sm" placeholder="搜索脚本" />
          </div>
        </div>
        <div className="side-list scroll grow">
          {scripts.map((s) => (
            <button key={s.name} className={cx('side-item', s.name === active && 'is-active')} onClick={() => setActive(s.name)}>
              <FileCode2 size={14} className="muted" />
              <span className="ellipsis grow mono">{s.name}</span>
              {s.usedBy.length > 0 && <span className="side-item-meta">{s.usedBy.length}</span>}
            </button>
          ))}
        </div>
        <div className="pane-footer">
          规则中使用 <code>script://name.js</code>
        </div>
      </aside>

      <section className="wb-main">
        <div className="pane-header">
          <input className="input editor-title-input mono" defaultValue={script.name} key={script.name} />
          <span className="muted text-xs">修改于 {formatRelative(script.updatedAt)}</span>
          <div className="spacer" />
          <button className="btn btn-ghost btn-icon" data-tip="删除">
            <Trash2 size={15} />
          </button>
          <button className="btn btn-primary">
            <Save size={14} /> 保存
          </button>
        </div>
        <CodeView key={script.name} value={script.content} lang="javascript" />
        <div className="pane-footer">
          <span>运行于隔离沙箱（goja）· 超时 1s · 无文件系统与网络访问</span>
          <div className="spacer" />
          {script.usedBy.length ? <span>被引用：{script.usedBy.join('、')}</span> : <span>未被引用</span>}
        </div>
      </section>

      <aside className="wb-aside" style={{ width: 380 }}>
        <div className="script-test">
          <div className="pane-header">
            <span className="pane-title grow">测试运行</span>
            <button className="btn btn-sm btn-primary">
              <Play size={13} /> 运行
            </button>
          </div>
          <div className="script-test-section">
            <div className="section-title">模拟请求</div>
            <div className="row">
              <select className="select input-sm" style={{ width: 90 }} defaultValue="GET">
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
              <input className="input input-sm mono" defaultValue="https://api.example.com/v1/order/10086?uid=48213" />
            </div>
            <textarea className="textarea mono" rows={3} placeholder="请求体（可选）" />
          </div>
          <div className="compose-response-meta">
            <span className={cx('badge', result.ok ? 'badge-success' : 'badge-danger')}>{result.ok ? '成功' : '失败'}</span>
            <span>
              状态 <b className="status status-2xx">{result.status}</b>
            </span>
            <span className="muted">{result.duration} ms</span>
          </div>
          <div className="script-output">
            <Tabs
              size="sm"
              active={outTab}
              onChange={setOutTab}
              items={[
                { key: 'body', label: 'Body' },
                { key: 'headers', label: 'Headers' },
                { key: 'logs', label: 'Console', badge: result.logs.length },
              ]}
            />
            {outTab === 'body' && <CodeView value={result.body ?? ''} lang="json" readOnly />}
            {outTab === 'headers' && (
              <div className="scroll grow">
                <KeyValueTable rows={Object.entries(result.headers ?? {}).map(([name, value]) => ({ name, value }))} />
              </div>
            )}
            {outTab === 'logs' && (
              <div className="scroll grow">
                {result.logs.map((l, i) => (
                  <div key={i} className={cx('log-line', l.level)}>
                    <span className="log-level">{l.level}</span>
                    <span>{l.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
