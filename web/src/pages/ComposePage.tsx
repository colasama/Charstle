import { useState } from 'react';
import { History, Plus, Send, Trash2 } from 'lucide-react';
import { Tabs } from '../components/common/Tabs';
import { KeyValueTable } from '../components/common/KeyValueTable';
import { CodeView } from '../components/common/CodeView';
import { Segmented, Switch } from '../components/common/Controls';
import { SplitPane } from '../components/common/SplitPane';
import { MethodText, StatusText } from '../components/common/Badges';
import { mockComposeHistory } from '../mock/data';
import { cx, formatMs, formatRelative } from '../utils/format';
import type { Header } from '../types';

type ReqTab = 'params' | 'headers' | 'body' | 'options';
type ResTab = 'body' | 'headers';

const sampleHeaders: Header[] = [
  { name: 'content-type', value: 'application/json', enabled: true },
  { name: 'authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIs…', enabled: true },
  { name: 'x-debug', value: '1', enabled: false },
];
const sampleBody = '{\n  "skuId": 10086,\n  "count": 2,\n  "coupon": "AUTUMN26"\n}';
const sampleResponse = '{\n  "code": 0,\n  "data": {\n    "orderId": "O202609300001",\n    "amount": 57.31\n  }\n}';

export function ComposePage() {
  const [reqTab, setReqTab] = useState<ReqTab>('body');
  const [resTab, setResTab] = useState<ResTab>('body');
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form' | 'text'>('json');
  // TODO(api): 发送调用 api.compose，结果同时进入会话列表
  const history = mockComposeHistory;

  const request = (
    <div className="compose-section">
      <Tabs<ReqTab>
        active={reqTab}
        onChange={setReqTab}
        items={[
          { key: 'params', label: 'Query' },
          { key: 'headers', label: 'Headers', badge: sampleHeaders.length },
          { key: 'body', label: 'Body' },
          { key: 'options', label: '选项' },
        ]}
      />
      {reqTab === 'params' && (
        <div className="scroll grow">
          <KeyValueTable rows={[]} editable />
        </div>
      )}
      {reqTab === 'headers' && (
        <div className="scroll grow">
          <KeyValueTable rows={sampleHeaders} editable />
        </div>
      )}
      {reqTab === 'body' && (
        <>
          <div className="body-toolbar">
            <Segmented
              value={bodyType}
              onChange={setBodyType}
              options={[
                { value: 'none', label: '无' },
                { value: 'json', label: 'JSON' },
                { value: 'form', label: 'Form' },
                { value: 'text', label: 'Text' },
              ]}
            />
          </div>
          {bodyType === 'form' ? (
            <div className="scroll grow">
              <KeyValueTable rows={[]} editable />
            </div>
          ) : bodyType === 'none' ? (
            <div className="grow" />
          ) : (
            <CodeView value={sampleBody} lang={bodyType === 'json' ? 'json' : 'text'} />
          )}
        </>
      )}
      {reqTab === 'options' && (
        <div className="compose-options">
          <label className="row">
            <Switch on /> 经过规则引擎（mapRemote / mock 等会生效）
          </label>
          <label className="row">
            <Switch on /> 自动跟随重定向
          </label>
          <label className="row">
            <Switch on={false} /> 忽略上游证书错误
          </label>
          <div className="row">
            <span style={{ width: 80 }}>超时</span>
            <input className="input input-sm" style={{ width: 100 }} defaultValue="30000" />
            <span className="muted text-xs">ms</span>
          </div>
        </div>
      )}
    </div>
  );

  const response = (
    <div className="compose-section">
      <div className="compose-response-meta">
        <span className="section-title">响应</span>
        <StatusText status={201} />
        <span className="muted">Created</span>
        <span className="muted">· {formatMs(212)}</span>
        <span className="muted">· 184 B</span>
        <div className="spacer" />
        <a className="text-xs">在抓包列表中查看 →</a>
      </div>
      <Tabs<ResTab>
        size="sm"
        active={resTab}
        onChange={setResTab}
        items={[
          { key: 'body', label: 'Body' },
          { key: 'headers', label: 'Headers' },
        ]}
      />
      {resTab === 'body' ? (
        <CodeView value={sampleResponse} lang="json" readOnly />
      ) : (
        <div className="scroll grow">
          <KeyValueTable rows={[{ name: 'content-type', value: 'application/json' }, { name: 'x-trace-id', value: '7f3a9b2c11d04e8a' }]} />
        </div>
      )}
    </div>
  );

  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          <History size={15} className="muted" />
          <span className="pane-title grow">历史</span>
          <button className="btn btn-ghost btn-icon btn-sm" data-tip="新建请求">
            <Plus size={15} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" data-tip="清空历史">
            <Trash2 size={14} />
          </button>
        </div>
        <div className="side-list scroll grow">
          {history.map((h, i) => (
            <button key={h.id} className={cx('side-item history-item', i === 0 && 'is-active')}>
              <span className="history-line">
                <MethodText method={h.method} />
                <span className="ellipsis grow mono text-xs">{h.url.replace(/^https?:\/\//, '')}</span>
              </span>
              <span className="history-line text-xs">
                <StatusText status={h.status} />
                <span className="faint">
                  {formatMs(h.duration)} · {formatRelative(h.at)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="wb-main">
        <div className="compose-bar">
          <select className="select" defaultValue="POST">
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input className="input" defaultValue="https://api.example.com/v1/order/create" />
          <button className="btn btn-primary btn-lg">
            <Send size={14} /> 发送
          </button>
        </div>
        <SplitPane direction="vertical" initial={320} min={160} first={request} second={response} />
      </section>
    </div>
  );
}
