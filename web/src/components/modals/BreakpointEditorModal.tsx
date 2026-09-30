import { useState } from "react";
import { Modal } from "../common/Modal";
import { AsyncButton } from "../common/AsyncButton";
import { KeyValueTable } from "../common/KeyValueTable";
import { CodeView } from "../common/CodeView";
import { api } from "../../api/client";
import { useData } from "../../store/data";
import type { PausedItem } from "../../types";
export function BreakpointEditorModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const item = useData((s) => s.paused.find((p) => p.id === id));
  return item ? (
    <Editor key={id} item={item} onClose={onClose} />
  ) : (
    <Modal title="断点已处理" onClose={onClose}>
      此请求已放行、中止或超时。
    </Modal>
  );
}
function Editor({ item, onClose }: { item: PausedItem; onClose: () => void }) {
  const [method, setMethod] = useState(item.method),
    [url, setURL] = useState(item.url),
    [status, setStatus] = useState(item.status ?? 200),
    [headers, setHeaders] = useState(item.headers),
    [body, setBody] = useState(item.body);
  const resolve = async (action: "continue" | "execute" | "abort") => {
    await api.resolvePaused(
      item.id,
      action,
      action === "execute"
        ? {
            method,
            url,
            status,
            headers,
            body: body === item.body ? undefined : body,
          }
        : undefined,
    );
    onClose();
  };
  return (
    <Modal
      size="xl"
      title={"编辑" + (item.phase === "request" ? "请求" : "响应")}
      onClose={onClose}
      footer={
        <>
          <AsyncButton className="btn btn-danger" run={() => resolve("abort")}>
            中止
          </AsyncButton>
          <AsyncButton className="btn" run={() => resolve("continue")}>
            不修改，直接放行
          </AsyncButton>
          <AsyncButton
            className="btn btn-primary"
            run={() => resolve("execute")}
          >
            应用修改并执行
          </AsyncButton>
        </>
      }
    >
      <div className="row">
        {item.phase === "request" ? (
          <>
            <select
              className="select"
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map(
                (m) => (
                  <option key={m}>{m}</option>
                ),
              )}
            </select>
            <input
              aria-label="URL"
              className="input"
              value={url}
              onChange={(e) => setURL(e.target.value)}
            />
          </>
        ) : (
          <input
            aria-label="响应状态码"
            className="input"
            type="number"
            value={status}
            onChange={(e) => setStatus(+e.target.value)}
          />
        )}
      </div>
      <KeyValueTable editable rows={headers} onChange={setHeaders} />
      <div style={{ height: 250 }}>
        <CodeView value={body} onChange={setBody} lang="text" />
      </div>
    </Modal>
  );
}
