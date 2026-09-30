import { useState } from "react";
import { PageHeader, Switch, FieldRow } from "../components/common/Controls";
import { StringList } from "../components/common/StringList";
import { AsyncButton } from "../components/common/AsyncButton";
import { useData } from "../store/data";
import { api, type ThrottleConfig } from "../api/client";
import { throttleProfiles } from "../data/reference";
export function ThrottlePage() {
  const initial = useData((s) => s.throttle);
  return <Editor key={JSON.stringify(initial)} initial={initial} />;
}
function Editor({ initial }: { initial: ThrottleConfig }) {
  const [c, setC] = useState(initial);
  return (
    <div className="page">
      <PageHeader
        title="网络限速"
        desc="限制每个请求的上传和下载速率，并模拟延迟及请求失败；0 表示不限制带宽。"
        actions={
          <AsyncButton
            className="btn btn-primary"
            run={() => api.saveThrottle(c)}
            message="限速配置已保存"
          >
            保存
          </AsyncButton>
        }
      />
      <div className="page-content">
        <section className="card">
          <div className="card-body">
            <FieldRow label="启用限速">
              <Switch
                on={c.enabled}
                onChange={(enabled) => setC({ ...c, enabled })}
              />
            </FieldRow>
            <div className="profile-grid">
              {throttleProfiles.map((p) => (
                <button
                  key={p.id}
                  className={
                    "profile-card " + (c.profile.id === p.id ? "is-active" : "")
                  }
                  onClick={() => setC({ ...c, profile: p })}
                >
                  <b>{p.name}</b>
                  <span>
                    {p.down} / {p.up} kbps · {p.latency} ms
                  </span>
                </button>
              ))}
            </div>
            {(
              [
                ["down", "下行 kbps"],
                ["up", "上行 kbps"],
                ["latency", "延迟 ms"],
                ["loss", "请求失败概率 %"],
              ] as const
            ).map(([key, label]) => (
              <FieldRow key={key} label={label}>
                <input
                  className="input"
                  type="number"
                  aria-label={label}
                  min={0}
                  max={key === "loss" ? 100 : undefined}
                  value={c.profile[key]}
                  onChange={(e) =>
                    setC({
                      ...c,
                      profile: {
                        ...c.profile,
                        id: "custom",
                        name: "自定义",
                        [key]: +e.target.value,
                      },
                    })
                  }
                />
              </FieldRow>
            ))}
            <FieldRow label="指定域名" hint="留空表示全部请求">
              <StringList
                items={c.hosts}
                onChange={(hosts) => setC({ ...c, hosts })}
                placeholder="*.example.com"
              />
            </FieldRow>
          </div>
        </section>
      </div>
    </div>
  );
}
