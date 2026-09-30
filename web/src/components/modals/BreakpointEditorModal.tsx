import { OctagonPause, Play, X, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { KeyValueTable } from '../common/KeyValueTable';
import { CodeView } from '../common/CodeView';
import { mockPaused } from '../../mock/data';

/** 断点拦截编辑器：修改请求（method/url/headers/body）或响应（status/headers/body）后放行 */
export function BreakpointEditorModal({ id, onClose }: { id: string; onClose: () => void }) {
  // TODO(api): api.resolvePaused(id, 'execute' | 'continue' | 'abort', edited)
  const p = mockPaused.find((x) => x.id === id) ?? mockPaused[0];
  const isReq = p.phase === 'request';

  return (
    <Modal
      size="xl"
      flush
      icon={<OctagonPause size={18} className="text-warning" />}
      title={
        <span className="row">
          断点 · {isReq ? '请求' : '响应'}
          <span className="badge badge-warning">等待中</span>
          <span className="muted text-sm mono" style={{ fontWeight: 400 }}>
            #{p.sessionId} · {p.device}
          </span>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger" onClick={onClose}>
            <X size={14} /> 中止
          </button>
          <div className="spacer" />
          <span className="muted text-xs">未修改时「放行」按原样继续</span>
          <button className="btn" onClick={onClose}>
            <Play size={14} /> 放行（不修改）
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            <Send size={14} /> 应用修改并继续
          </button>
        </>
      }
    >
      <div className="bp-editor">
        <div className="bp-line">
          {isReq ? (
            <>
              <select className="select mono" defaultValue={p.method}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input className="input mono" defaultValue={p.url} />
            </>
          ) : (
            <>
              <span className="muted text-sm">状态码</span>
              <input className="input mono" style={{ width: 90 }} defaultValue={p.status} />
              <span className="muted mono text-sm ellipsis grow">
                {p.method} {p.url}
              </span>
            </>
          )}
        </div>
        <div className="bp-panes">
          <div className="bp-pane">
            <div className="bp-pane-title">Headers</div>
            <div className="scroll grow">
              <KeyValueTable rows={p.headers} editable />
            </div>
          </div>
          <div className="bp-pane">
            <div className="bp-pane-title">Body</div>
            <CodeView value={p.body} lang="json" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
