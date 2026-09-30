import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { CodeView } from "../components/common/CodeView";
import { KeyValueTable } from "../components/common/KeyValueTable";
import { Switch, EmptyState } from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { SplitPane } from "../components/common/SplitPane";
import { Tabs } from "../components/common/Tabs";
import { api, type ComposePayload } from "../api/client";
import { useUI } from "../store/ui";
import type { Header, HttpMethod, SessionDetail } from "../types";
export function ComposePage() {
  const location = useLocation();
  const nav = useNavigate();
  const initial = location.state as SessionDetail | undefined;
  const [method, setMethod] = useState<HttpMethod>(initial?.method ?? "GET"),
    [url, setURL] = useState(initial?.url ?? "https://example.com/"),
    [headers, setHeaders] = useState<Header[]>(initial?.reqHeaders ?? []),
    [body, setBody] = useState(initial?.reqBody?.text ?? "");
  const [viaRules, setRules] = useState(true),
    [redirects, setRedirects] = useState(false),
    [timeout, setTimeout] = useState(30000),
    [tab, setTab] = useState("body"),
    [resTab, setResTab] = useState("body");
  const [result, setResult] = useState<SessionDetail | null>(null),
    [history, setHistory] = useState<
      { payload: ComposePayload; result: SessionDetail }[]
    >([]);
  const request = (
    <div className="compose-section">
      <Tabs
        active={tab}
        onChange={setTab}
        items={[
          { key: "headers", label: "Headers", badge: headers.length },
          { key: "body", label: "Body" },
          { key: "options", label: "选项" },
        ]}
      />
      {tab === "headers" ? (
        <div className="scroll grow">
          <KeyValueTable rows={headers} editable onChange={setHeaders} />
        </div>
      ) : tab === "body" ? (
        <CodeView value={body} onChange={setBody} lang="json" />
      ) : (
        <div className="compose-options">
          <label className="row">
            <Switch on={viaRules} onChange={setRules} />
            经过规则引擎
          </label>
          <label className="row">
            <Switch on={redirects} onChange={setRedirects} />
            跟随重定向
          </label>
          <label className="row">
            超时 (ms)
            <input
              className="input"
              type="number"
              min={1}
              max={300000}
              value={timeout}
              onChange={(e) => setTimeout(+e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
  const response = result ? (
    <div className="compose-section">
      <div className="compose-response-meta">
        {result.status} {result.statusText} · {result.duration} ms{" "}
        {result.error && <span className="text-danger">{result.error}</span>}
        <div className="spacer" />
        <button
          className="btn btn-sm"
          onClick={() => {
            useUI.getState().selectSession(result.id);
            nav("/network");
          }}
        >
          查看会话 #{result.id}
        </button>
      </div>
      <Tabs
        active={resTab}
        onChange={setResTab}
        items={[
          { key: "body", label: "Body" },
          { key: "headers", label: "Headers" },
        ]}
      />
      {resTab === "body" ? (
        <CodeView value={result.resBody?.text ?? ""} lang="json" readOnly />
      ) : (
        <KeyValueTable rows={result.resHeaders} />
      )}
    </div>
  ) : (
    <EmptyState title="发送请求后查看响应" />
  );
  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          本次构造历史
          <button className="btn btn-sm" onClick={() => setHistory([])}>
            清空
          </button>
        </div>
        <div className="side-list scroll grow">
          {history.map((h, i) => (
            <button
              key={i}
              className="side-item"
              onClick={() => {
                setMethod(h.payload.method);
                setURL(h.payload.url);
                setHeaders(h.payload.headers);
                setBody(h.payload.body);
                setResult(h.result);
              }}
            >
              {h.payload.method} {h.payload.url}
            </button>
          ))}
        </div>
      </aside>
      <section className="wb-main">
        <div className="compose-bar">
          <select
            aria-label="HTTP 方法"
            className="select"
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(
              (m) => (
                <option key={m}>{m}</option>
              ),
            )}
          </select>
          <input
            className="input mono"
            aria-label="请求 URL"
            value={url}
            onChange={(e) => setURL(e.target.value)}
          />
          <AsyncButton
            className="btn btn-primary"
            run={async () => {
              const payload = {
                method,
                url,
                headers,
                body,
                viaRules,
                followRedirects: redirects,
                timeoutMs: timeout,
              };
              const result = await api.compose(payload);
              setResult(result);
              setHistory((h) => [{ payload, result }, ...h].slice(0, 50));
            }}
          >
            <Send size={14} />
            发送
          </AsyncButton>
        </div>
        <SplitPane
          direction="vertical"
          initial={320}
          min={160}
          first={request}
          second={response}
        />
      </section>
    </div>
  );
}
