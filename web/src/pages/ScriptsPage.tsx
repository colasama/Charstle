import { useState } from "react";
import { Plus, Save, Trash2, Play } from "lucide-react";
import { CodeView } from "../components/common/CodeView";
import { EmptyState } from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { useData } from "../store/data";
import { api } from "../api/client";
import type { MockScript, ScriptRunResult, HttpMethod } from "../types";
const initial =
  'exports.handle = function(req, ctx) {\n  return { status: 200, body: { message: "Hello from Charstle" } };\n};\n';
export function ScriptsPage() {
  const scripts = useData((s) => s.scripts);
  const [active, setActive] = useState("");
  const [query, setQuery] = useState("");
  const item = scripts.find((s) => s.name === active) ?? scripts[0];
  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          <span className="grow pane-title">Mock 脚本</span>
          <AsyncButton
            className="btn btn-sm"
            run={async () => {
              const name = prompt("脚本名，例如 hello.js");
              if (name?.trim()) {
                if (scripts.some((s) => s.name === name))
                  throw Error("脚本已存在");
                await api.saveScript({ name, content: initial });
                setActive(name);
              }
            }}
          >
            <Plus size={14} />
            新建
          </AsyncButton>
        </div>
        <div className="pane-search">
          <input
            className="input"
            placeholder="搜索脚本"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="side-list scroll grow">
          {scripts
            .filter((s) => s.name.includes(query))
            .map((s) => (
              <button
                key={s.name}
                className={
                  "side-item " + (s.name === item?.name ? "is-active" : "")
                }
                onClick={() => setActive(s.name)}
              >
                {s.name}
              </button>
            ))}
        </div>
        <div className="pane-footer">规则中使用 script://name.js</div>
      </aside>
      {item ? (
        <ScriptEditor key={item.name} item={item} />
      ) : (
        <EmptyState
          title="还没有脚本"
          desc="创建 exports.handle(req, ctx) 返回自定义响应"
        />
      )}
    </div>
  );
}
function ScriptEditor({ item }: { item: MockScript }) {
  const [content, setContent] = useState(item.content),
    [url, setURL] = useState("https://example.com/"),
    [method, setMethod] = useState<HttpMethod>("GET"),
    [body, setBody] = useState("");
  const [result, setResult] = useState<ScriptRunResult | null>(null);
  return (
    <>
      <section className="wb-main">
        <div className="pane-header">
          <b>{item.name}</b>
          <div className="spacer" />
          <AsyncButton
            aria-label="删除脚本"
            className="btn btn-icon"
            run={async () => {
              if (confirm("删除此脚本？")) await api.deleteScript(item.name);
            }}
          >
            <Trash2 size={14} />
          </AsyncButton>
          <AsyncButton
            className="btn btn-primary"
            run={() => api.saveScript({ name: item.name, content })}
            message="脚本已保存"
          >
            <Save size={14} />
            保存
          </AsyncButton>
        </div>
        <CodeView value={content} lang="javascript" onChange={setContent} />
        <div className="pane-footer">
          隔离运行时 · 执行超时 1 秒 · 无文件与网络接口
        </div>
      </section>
      <aside className="wb-aside" style={{ width: 380 }}>
        <div className="pane-header">
          <b className="grow">测试运行</b>
          <AsyncButton
            className="btn btn-primary"
            run={async () => {
              await api.saveScript({ name: item.name, content });
              setResult(
                await api.runScript(item.name, {
                  method,
                  url,
                  body,
                  headers: [],
                  viaRules: false,
                  followRedirects: false,
                  timeoutMs: 1000,
                }),
              );
            }}
          >
            <Play size={13} />
            运行
          </AsyncButton>
        </div>
        <div className="script-test-section">
          <select
            className="select"
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            className="input mono"
            aria-label="测试 URL"
            value={url}
            onChange={(e) => setURL(e.target.value)}
          />
          <textarea
            className="textarea mono"
            placeholder="请求体"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {result ? (
          <>
            <div className="pane-header">
              {result.ok ? "成功" : "失败"} · {result.status || "继续请求上游"}{" "}
              · {result.duration} ms
            </div>
            <CodeView
              value={result.error || result.body || ""}
              lang="json"
              readOnly
            />
            {result.logs.map((l, i) => (
              <div className={"log-line " + l.level} key={i}>
                {l.level}: {l.text}
              </div>
            ))}
          </>
        ) : (
          <EmptyState title="运行后查看结果" />
        )}
      </aside>
    </>
  );
}
