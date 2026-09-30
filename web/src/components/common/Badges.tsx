import { Ban, CircleAlert, FlaskConical, Hourglass, Lock, PauseCircle, Route, Gauge } from 'lucide-react';
import type { SessionSummary } from '../../types';
import { statusClass } from '../../utils/format';

export function MethodText({ method }: { method: string }) {
  return <span className={`method method-${method}`}>{method}</span>;
}

export function StatusText({ status, state }: { status?: number; state?: SessionSummary['state'] }) {
  const label =
    state === 'error' ? 'ERR' : state === 'aborted' ? 'ABRT' : state === 'tunnel' ? '—' : state === 'paused' ? 'PAUSE' : (status ?? '···');
  return <span className={`status ${statusClass(status, state)}`}>{label}</span>;
}

/** 会话行首的状态图标：隧道 / 断点 / 错误 / Mock / 改写 / 限速 */
export function SessionFlags({ s }: { s: SessionSummary }) {
  const size = 13;
  if (s.state === 'tunnel')
    return (
      <span className="flag flag-muted" data-tip="未解密的 HTTPS 隧道">
        <Lock size={size} />
      </span>
    );
  if (s.state === 'paused')
    return (
      <span className="flag flag-warning" data-tip="已被断点拦截">
        <PauseCircle size={size} />
      </span>
    );
  if (s.state === 'error')
    return (
      <span className="flag flag-danger" data-tip="请求失败">
        <CircleAlert size={size} />
      </span>
    );
  if (s.state === 'aborted')
    return (
      <span className="flag flag-danger" data-tip="已阻止">
        <Ban size={size} />
      </span>
    );
  if (s.state === 'pending')
    return (
      <span className="flag flag-muted" data-tip="等待响应">
        <Hourglass size={size} />
      </span>
    );
  if (s.mocked)
    return (
      <span className="flag flag-purple" data-tip="Mock 响应（未访问上游）">
        <FlaskConical size={size} />
      </span>
    );
  if (s.remapped)
    return (
      <span className="flag flag-accent" data-tip="已改写目标地址">
        <Route size={size} />
      </span>
    );
  if (s.throttled)
    return (
      <span className="flag flag-info" data-tip="已限速">
        <Gauge size={size} />
      </span>
    );
  return <span className="flag" />;
}
