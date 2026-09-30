import { useState } from 'react';
import type { Header, SessionDetail } from '../../../types';
import { Tabs } from '../../common/Tabs';
import { KeyValueTable } from '../../common/KeyValueTable';
import { CodeView } from '../../common/CodeView';
import { EmptyState } from '../../common/Controls';
import { BodyViewer } from './BodyViewer';
import { Inbox } from 'lucide-react';

type Sub = 'headers' | 'query' | 'cookies' | 'body' | 'raw';

function parseQuery(url: string): Header[] {
  try {
    return [...new URL(url).searchParams.entries()].map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}

function parseCookies(headers: Header[], kind: 'request' | 'response'): Header[] {
  if (kind === 'request') {
    const c = headers.find((h) => h.name.toLowerCase() === 'cookie');
    return c ? c.value.split(';').map((p) => {
      const [name, ...rest] = p.trim().split('=');
      return { name, value: rest.join('=') };
    }) : [];
  }
  return headers
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => {
      const [kv] = h.value.split(';');
      const [name, ...rest] = kv.split('=');
      return { name, value: rest.join('=') };
    });
}

function rawText(s: SessionDetail, kind: 'request' | 'response'): string {
  if (kind === 'request') {
    const u = new URL(s.url);
    const head = `${s.method} ${u.pathname}${u.search} ${s.httpVersion}`;
    return [head, ...s.reqHeaders.map((h) => `${h.name}: ${h.value}`), '', s.reqBody?.text ?? ''].join('\n');
  }
  const head = `${s.httpVersion} ${s.status ?? ''} ${s.statusText ?? ''}`;
  return [head, ...s.resHeaders.map((h) => `${h.name}: ${h.value}`), '', s.resBody?.text ?? ''].join('\n');
}

export function MessageTab({ s, kind }: { s: SessionDetail; kind: 'request' | 'response' }) {
  const [sub, setSub] = useState<Sub>(kind === 'response' ? 'body' : 'headers');
  const headers = kind === 'request' ? s.reqHeaders : s.resHeaders;
  const body = kind === 'request' ? s.reqBody : s.resBody;
  const query = kind === 'request' ? parseQuery(s.url) : [];
  const cookies = parseCookies(headers, kind);

  if (kind === 'response' && !s.status) {
    return <EmptyState icon={<Inbox size={20} />} title="暂无响应" desc={s.state === 'tunnel' ? '该连接未解密，只能看到隧道信息' : s.state === 'error' ? s.error : '等待服务端响应…'} />;
  }

  return (
    <div className="message-tab">
      <Tabs<Sub>
        size="sm"
        active={sub}
        onChange={setSub}
        items={[
          { key: 'headers', label: 'Headers', badge: headers.length },
          { key: 'query', label: 'Query', badge: query.length || undefined, hidden: kind === 'response' },
          { key: 'cookies', label: kind === 'request' ? 'Cookies' : 'Set-Cookie', badge: cookies.length || undefined },
          { key: 'body', label: 'Body' },
          { key: 'raw', label: 'Raw' },
        ]}
      />
      <div className="message-body">
        {sub === 'headers' && (
          <div className="scroll fill">
            <KeyValueTable rows={headers} />
          </div>
        )}
        {sub === 'query' &&
          (query.length ? (
            <div className="scroll fill">
              <KeyValueTable rows={query} />
            </div>
          ) : (
            <EmptyState title="无 Query 参数" />
          ))}
        {sub === 'cookies' &&
          (cookies.length ? (
            <div className="scroll fill">
              <KeyValueTable rows={cookies} />
            </div>
          ) : (
            <EmptyState title="无 Cookie" />
          ))}
        {sub === 'body' && (body ? <BodyViewer body={body} /> : <EmptyState icon={<Inbox size={20} />} title="无 Body" />)}
        {sub === 'raw' && <CodeView value={rawText(s, kind)} readOnly wrap lineNumbers={false} />}
      </div>
    </div>
  );
}
