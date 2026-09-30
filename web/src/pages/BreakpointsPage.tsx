import { useEffect, useState } from "react";
import { PageHeader, Switch, EmptyState } from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { useData, toggleGlobal } from "../store/data";
import { useUI } from "../store/ui";
import { api } from "../api/client";
import type { BreakpointRule } from "../types";
export function BreakpointsPage() {
  const { breakpoints, paused } = useData();
  const enabled = useUI((s) => s.breakpoints);
  const [draft, setDraft] = useState(breakpoints);
  useEffect(() => setDraft(breakpoints), [JSON.stringify(breakpoints)]);
  const patch = (id: string, p: Partial<BreakpointRule>) =>
    setDraft((v) => v.map((r) => (r.id === id ? { ...r, ...p } : r)));
  return (
    <div className="page">
      <PageHeader
        title="断点"
        desc="拦截请求或响应，修改后放行；默认等待 5 分钟后自动继续。"
        actions={
          <Switch
            label="启用断点"
            on={enabled}
            onChange={() => void toggleGlobal("breakpoints")}
          />
        }
      />
      <div className="page-content">
        <section className="card">
          <div className="card-header">
            <b className="grow">等待处理 · {paused.length}</b>
            <AsyncButton
              className="btn btn-sm"
              disabled={!paused.length}
              run={() =>
                Promise.all(
                  paused.map((p) => api.resolvePaused(p.id, "continue")),
                )
              }
            >
              全部放行
            </AsyncButton>
            <AsyncButton
              className="btn btn-danger btn-sm"
              disabled={!paused.length}
              run={() =>
                Promise.all(paused.map((p) => api.resolvePaused(p.id, "abort")))
              }
            >
              全部中止
            </AsyncButton>
          </div>
          <div className="card-body">
            {paused.length ? (
              paused.map((p) => (
                <div className="paused-card" key={p.id}>
                  <span className="badge">
                    {p.phase === "request" ? "请求" : "响应"}
                  </span>
                  <span>{p.method}</span>
                  <span className="grow ellipsis">{p.url}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      useUI
                        .getState()
                        .openModal({ type: "breakpoint", id: p.id })
                    }
                  >
                    编辑
                  </button>
                  <AsyncButton
                    className="btn btn-sm"
                    run={() => api.resolvePaused(p.id, "continue")}
                  >
                    放行
                  </AsyncButton>
                  <AsyncButton
                    className="btn btn-sm btn-danger"
                    run={() => api.resolvePaused(p.id, "abort")}
                  >
                    中止
                  </AsyncButton>
                </div>
              ))
            ) : (
              <EmptyState title="没有被拦截的请求" />
            )}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <b className="grow">断点规则</b>
            <button
              className="btn btn-sm"
              onClick={() =>
                setDraft((v) => [
                  ...v,
                  {
                    id: crypto.randomUUID(),
                    enabled: true,
                    pattern: "example.com",
                    method: "*",
                    request: true,
                    response: false,
                    hitCount: 0,
                  },
                ])
              }
            >
              添加断点
            </button>
            <AsyncButton
              className="btn btn-primary btn-sm"
              run={() => api.saveBreakpoints(draft)}
              message="断点规则已保存"
            >
              保存规则
            </AsyncButton>
          </div>
          <div className="card-body flush">
            <table className="table">
              <thead>
                <tr>
                  <th>启用</th>
                  <th>匹配</th>
                  <th>方法</th>
                  <th>请求</th>
                  <th>响应</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Switch
                        on={r.enabled}
                        onChange={(enabled) => patch(r.id, { enabled })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="断点匹配"
                        className="input"
                        value={r.pattern}
                        onChange={(e) =>
                          patch(r.id, { pattern: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        value={r.method}
                        onChange={(e) =>
                          patch(r.id, {
                            method: e.target.value as BreakpointRule["method"],
                          })
                        }
                      >
                        {[
                          "*",
                          "GET",
                          "POST",
                          "PUT",
                          "PATCH",
                          "DELETE",
                          "HEAD",
                          "OPTIONS",
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label="请求断点"
                        type="checkbox"
                        checked={r.request}
                        onChange={(e) =>
                          patch(r.id, { request: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label="响应断点"
                        type="checkbox"
                        checked={r.response}
                        onChange={(e) =>
                          patch(r.id, { response: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setDraft((v) => v.filter((b) => b.id !== r.id))
                        }
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
