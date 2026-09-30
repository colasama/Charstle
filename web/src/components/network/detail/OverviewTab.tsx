import { CircleAlert, Route } from 'lucide-react';
import type { SessionDetail } from '../../../types';
import { formatBytes, formatMs, formatTime } from '../../../utils/format';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ov-section">
      <div className="section-title">{title}</div>
      <dl className="kv">{children}</dl>
    </section>
  );
}

export function OverviewTab({ s }: { s: SessionDetail }) {
  return (
    <div className="scroll fill ov">
      {s.error && (
        <div className="callout callout-danger">
          <CircleAlert size={15} />
          <div>
            <b>请求失败</b>
            <div className="mono">{s.error}</div>
          </div>
        </div>
      )}
      {s.finalUrl && (
        <div className="callout">
          <Route size={15} />
          <div>
            已被规则改写，实际请求：
            <div className="mono">{s.finalUrl}</div>
          </div>
        </div>
      )}

      <Section title="基本信息">
        <dt>URL</dt>
        <dd className="mono">{s.url}</dd>
        <dt>状态</dt>
        <dd>
          {s.status ?? '—'} {s.statusText}
        </dd>
        <dt>方法</dt>
        <dd>{s.method}</dd>
        <dt>协议</dt>
        <dd>{s.httpVersion}</dd>
        <dt>开始时间</dt>
        <dd>{formatTime(s.startedAt)}</dd>
        <dt>总耗时</dt>
        <dd>{formatMs(s.duration)}</dd>
      </Section>

      <Section title="连接">
        <dt>客户端</dt>
        <dd>
          {s.clientIp} {s.device && <span className="muted">· {s.device}</span>}
        </dd>
        <dt>远端地址</dt>
        <dd className="mono">{s.remoteAddr ?? <span className="muted">未连接上游（Mock）</span>}</dd>
        {s.tls && (
          <>
            <dt>TLS</dt>
            <dd>
              {s.tls.version} · <span className="mono">{s.tls.cipher}</span>
            </dd>
            <dt>SNI / ALPN</dt>
            <dd className="mono">
              {s.tls.sni} / {s.tls.alpn}
            </dd>
            <dt>解密</dt>
            <dd>{s.tls.intercepted ? <span className="badge badge-success">已解密（MITM）</span> : <span className="badge">隧道透传</span>}</dd>
            {s.tls.serverCert && (
              <>
                <dt>服务端证书</dt>
                <dd>
                  <div className="mono">{s.tls.serverCert.subject}</div>
                  <div className="muted text-xs">
                    颁发者 {s.tls.serverCert.issuer} · 到期 {s.tls.serverCert.notAfter}
                  </div>
                </dd>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="大小">
        <dt>请求</dt>
        <dd>{formatBytes(s.reqSize)}</dd>
        <dt>响应（传输）</dt>
        <dd>
          {formatBytes(s.resBody?.size ?? s.resSize)}
          {s.resBody?.encoding && <span className="badge" style={{ marginLeft: 6 }}>{s.resBody.encoding}</span>}
        </dd>
        <dt>响应（解码后）</dt>
        <dd>{formatBytes(s.resBody?.decodedSize ?? s.resBody?.size)}</dd>
      </Section>
    </div>
  );
}
