import type { SessionDetail, Timing } from '../../../types';
import { formatMs } from '../../../utils/format';

const PHASES: { key: keyof Timing; label: string; color: string; desc: string }[] = [
  { key: 'blocked', label: '排队', color: 'var(--text-faint)', desc: '等待可用连接' },
  { key: 'dns', label: 'DNS', color: 'var(--info)', desc: '域名解析（host 规则会跳过）' },
  { key: 'connect', label: 'TCP 连接', color: 'var(--warning)', desc: '与上游建立 TCP 连接' },
  { key: 'tls', label: 'TLS 握手', color: 'var(--purple)', desc: '与上游的 TLS 握手' },
  { key: 'send', label: '发送', color: 'var(--pink)', desc: '发送请求头与请求体' },
  { key: 'wait', label: '等待 (TTFB)', color: 'var(--success)', desc: '等待首字节' },
  { key: 'receive', label: '接收', color: 'var(--accent)', desc: '下载响应体' },
];

export function TimingTab({ s }: { s: SessionDetail }) {
  const total = PHASES.reduce((a, p) => a + (s.timing[p.key] ?? 0), 0) || 1;
  let offset = 0;

  return (
    <div className="scroll fill timing">
      <div className="timing-total">
        <span className="muted">总耗时</span>
        <b>{formatMs(total)}</b>
        {s.mocked && <span className="badge badge-purple">Mock：未访问上游</span>}
      </div>
      <div className="timing-rows">
        {PHASES.map((p) => {
          const v = s.timing[p.key];
          const left = (offset / total) * 100;
          if (v != null) offset += v;
          return (
            <div key={p.key} className="timing-row" title={p.desc}>
              <span className="timing-label">
                <i style={{ background: p.color }} />
                {p.label}
              </span>
              <div className="timing-track">
                {v != null && <span className="timing-bar" style={{ left: `${left}%`, width: `max(2px, ${(v / total) * 100}%)`, background: p.color }} />}
              </div>
              <span className="timing-value">{v != null ? formatMs(v) : <span className="faint">复用</span>}</span>
            </div>
          );
        })}
      </div>
      <p className="muted text-xs" style={{ marginTop: 16 }}>
        耗时从代理收到请求开始计算，不包含客户端到代理之间的网络时间。
      </p>
    </div>
  );
}
