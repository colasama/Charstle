import { useState } from "react";
import { Plus, Save, Trash2, Copy } from "lucide-react";
import { CodeView, type CodeLang } from "../components/common/CodeView";
import { EmptyState } from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { useData } from "../store/data";
import { api } from "../api/client";
import type { ValueItem, ValueType } from "../types";
const langs: Record<ValueType, CodeLang> = {
  json: "json",
  text: "text",
  headers: "text",
  html: "html",
};
export function ValuesPage() {
  const values = useData((s) => s.values);
  const [active, setActive] = useState("");
  const [query, setQuery] = useState("");
  const item = values.find((v) => v.key === active) ?? values[0];
  return (
    <div className="workbench">
      <aside className="wb-side">
        <div className="pane-header">
          <span className="grow pane-title">Values</span>
          <AsyncButton
            className="btn btn-sm"
            run={async () => {
              const key = prompt("Value key");
              if (key?.trim()) {
                if (values.some((v) => v.key === key))
                  throw Error("此 key 已存在");
                await api.saveValue({ key, type: "json", content: "{}" });
                setActive(key);
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
            placeholder="搜索 key"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="side-list scroll grow">
          {values
            .filter((v) => v.key.includes(query))
            .map((v) => (
              <button
                className={
                  "side-item " + (v.key === item?.key ? "is-active" : "")
                }
                key={v.key}
                onClick={() => setActive(v.key)}
              >
                <span className={"value-type t-" + v.type}>{v.type}</span>
                <span className="mono grow">{v.key}</span>
              </button>
            ))}
        </div>
        <div className="pane-footer">在规则中用 {"{key}"} 引用</div>
      </aside>
      {item ? (
        <ValueEditor key={item.key} item={item} />
      ) : (
        <EmptyState
          title="还没有 Value"
          desc="创建可复用的 JSON、文本、HTML 或请求头"
        />
      )}
    </div>
  );
}
function ValueEditor({ item }: { item: ValueItem }) {
  const [content, setContent] = useState(item.content);
  const [type, setType] = useState(item.type);
  return (
    <section className="wb-main">
      <div className="pane-header">
        <b className="mono">{"{" + item.key + "}"}</b>
        <select
          aria-label="Value 类型"
          className="select"
          value={type}
          onChange={(e) => setType(e.target.value as ValueType)}
        >
          {Object.keys(langs).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <div className="spacer" />
        {type === "json" && (
          <AsyncButton
            className="btn"
            run={async () =>
              setContent(JSON.stringify(JSON.parse(content), null, 2))
            }
          >
            格式化
          </AsyncButton>
        )}
        <AsyncButton
          className="btn btn-icon"
          aria-label="复制引用"
          run={() => navigator.clipboard.writeText("{" + item.key + "}")}
        >
          <Copy size={14} />
        </AsyncButton>
        <AsyncButton
          className="btn btn-icon"
          aria-label="删除 Value"
          run={async () => {
            if (confirm("删除 " + item.key + "？"))
              await api.deleteValue(item.key);
          }}
        >
          <Trash2 size={14} />
        </AsyncButton>
        <AsyncButton
          className="btn btn-primary"
          run={() => api.saveValue({ key: item.key, type, content })}
          message="Value 已保存"
        >
          <Save size={14} />
          保存
        </AsyncButton>
      </div>
      <CodeView value={content} lang={langs[type]} onChange={setContent} />
      <div className="pane-footer">
        {item.usedBy.length
          ? "被引用：" + item.usedBy.join("、")
          : "未被规则引用"}
      </div>
    </section>
  );
}
