import { OctagonPause, Pencil, Play, Plus, Trash2, X, Info } from 'lucide-react';
import { PageHeader, Switch, EmptyState } from '../components/common/Controls';
import { MethodText } from '../components/common/Badges';
import { useUI } from '../store/ui';
import { mockBreakpoints, mockPaused } from '../mock/data';
import { cx } from '../utils/format';

function waited(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function BreakpointsPage() {
  const { breakpoints: enabled, toggle, openModal } = useUI();
  // TODO(api): 断点规则 /api/breakpoints；拦截队列来自事件流 breakpoint.paused
  const rules = mockBreakpoints;
  const paused = mockPaused;

  return (
    <div className="page">
      <PageHeader
        icon={<OctagonPause size={18} />}
        title="断点"
        desc="拦截匹配的请求或响应，手动修改后再放行。客户端会一直等待直到你处理（或超时）。"
        actions={
          <>
            <span className="muted text-sm">{enabled ? '断点已启用' : '断点已停用'}</span>
            <Switch on={enabled} onChange={() => toggle('breakpoints')} />
          </>
        }
      />
      <div className="page-content">
        <section className="card">
          <div className="card-header">
            <span className="card-title">等待处理</span>
            {paused.length > 0 && <span className="badge badge-warning badge-pill">{paused.length}</span>}
            <div className="spacer" />
            <button className="btn btn-sm" disabled={!paused.length}>
              <Play size={13} /> 全部放行
            </button>
            <button className="btn btn-sm btn-danger" disabled={!paused.length}>
              <X size={13} /> 全部中止
            </button>
          </div>
          <div className="card-body">
            {paused.length ? (
              <div className="paused-list">
                {paused.map((p) => (
                  <div key={p.id} className="paused-card">
                    <span className={cx('badge', p.phase === 'request' ? 'badge-accent' : 'badge-success')}>{p.phase === 'request' ? '请求' : '响应'}</span>
                    <MethodText method={p.method} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="paused-url ellipsis">{p.url}</div>
                      <div className="muted text-xs">
                        {p.device} · {p.clientIp} · 会话 #{p.sessionId}
                      </div>
                    </div>
                    <span className="paused-timer" data-tip="已等待">
                      {waited(p.pausedAt)}
                    </span>
                    <button className="btn btn-sm btn-primary" onClick={() => openModal({ type: 'breakpoint', id: p.id })}>
                      <Pencil size={13} /> 编辑
                    </button>
                    <button className="btn btn-sm">
                      <Play size={13} /> 放行
                    </button>
                    <button className="btn btn-sm btn-danger">
                      <X size={13} /> 中止
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="没有被拦截的请求" desc="命中下方断点规则的请求会出现在这里" />
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <span className="card-title">断点规则</span>
            <span className="card-subtitle">pattern 语法与规则页相同</span>
            <div className="spacer" />
            <button className="btn btn-sm btn-primary">
              <Plus size={13} /> 添加断点
            </button>
          </div>
          <div className="card-body flush">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>启用</th>
                  <th>匹配</th>
                  <th style={{ width: 110 }}>方法</th>
                  <th style={{ width: 90 }}>请求</th>
                  <th style={{ width: 90 }}>响应</th>
                  <th style={{ width: 80 }}>命中</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Switch size="sm" on={r.enabled} />
                    </td>
                    <td>
                      <input className="input input-sm mono" defaultValue={r.pattern} />
                    </td>
                    <td>
                      <select className="select input-sm" defaultValue={r.method}>
                        <option value="*">全部</option>
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>PATCH</option>
                        <option>DELETE</option>
                      </select>
                    </td>
                    <td>
                      <input type="checkbox" defaultChecked={r.request} />
                    </td>
                    <td>
                      <input type="checkbox" defaultChecked={r.response} />
                    </td>
                    <td className="mono">{r.hitCount}</td>
                    <td className="col-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" data-tip="删除">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer">
            <div className="callout" style={{ flex: 1 }}>
              <Info size={14} />
              拦截超过 5 分钟未处理会自动放行，可在「设置 → 抓包」中修改。
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
