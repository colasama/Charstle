import { useState } from "react";
import {
  FieldRow,
  Switch,
  Segmented,
  EmptyState,
} from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { useData, toggleGlobal } from "../store/data";
import { useUI } from "../store/ui";
import { api } from "../api/client";
import type { Settings } from "../types";
const sections: {
  title: string;
  fields: [keyof Settings, string, string?][];
}[] = [
  {
    title: "基础",
    fields: [
      ["proxyPort", "代理端口"],
      ["listenAddr", "监听地址", "0.0.0.0 允许局域网设备接入"],
      ["adminPort", "管理端口"],
      ["adminLanAccess", "允许局域网管理", "开启时必须设置密码"],
      ["adminPassword", "管理密码"],
    ],
  },
  {
    title: "抓包",
    fields: [
      ["maxSessions", "最多保留会话"],
      ["maxMemoryMB", "会话内存上限 (MB)"],
      [
        "bodyCaptureLimitKB",
        "Body 捕获上限 (KB)",
        "截断捕获内容，不影响流量转发",
      ],
      ["spillDir", "大 Body 落盘目录"],
      ["recordTunnels", "记录未解密的隧道"],
      ["breakpointTimeoutS", "断点超时 (秒)"],
    ],
  },
  {
    title: "协议",
    fields: [
      ["http2", "HTTP/2"],
      ["captureWebSocket", "捕获 WebSocket 帧"],
      ["decodeBody", "自动解码 Body"],
    ],
  },
  {
    title: "上游与 DNS",
    fields: [
      ["upstreamProxy", "上游代理", "http://、https:// 或 socks5://"],
      ["upstreamBypass", "绕过上游代理", "每行一个域名匹配"],
      ["dnsServers", "自定义 DNS", "逗号分隔，留空使用系统 DNS"],
      ["useHostsFile", "读取系统 hosts 文件", "关闭时必须配置自定义 DNS"],
    ],
  },
  {
    title: "系统代理",
    fields: [["systemProxyBypass", "绕过系统代理", "每行一个域名"]],
  },
];
export function SettingsPage() {
  const settings = useData((s) => s.settings);
  return settings ? (
    <Editor initial={settings} />
  ) : (
    <EmptyState title="正在加载设置…" />
  );
}
function Editor({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const ui = useUI();
  const patch = (key: keyof Settings, value: string | number | boolean) =>
    setS((s) => ({ ...s, [key]: value }));
  return (
    <div className="page">
      <header className="page-header">
        <div className="grow">
          <h1 className="page-title">设置</h1>
          <p className="page-desc">
            此页设置保存后重启服务生效；全局开关立即生效。
          </p>
        </div>
        <AsyncButton
          className="btn btn-primary"
          run={() => api.saveSettings(s)}
          message="设置已保存，重启服务后生效"
        >
          保存
        </AsyncButton>
      </header>
      <div className="page-content">
        {sections.map((section) => (
          <section className="card" key={section.title}>
            <div className="card-header">
              <b>{section.title}</b>
            </div>
            <div className="card-body">
              {section.fields.map(([key, label, hint]) => (
                <FieldRow key={key} label={label} hint={hint}>
                  {typeof s[key] === "boolean" ? (
                    <Switch
                      label={label}
                      on={s[key] as boolean}
                      onChange={(v) => patch(key, v)}
                    />
                  ) : (
                    <input
                      className="input mono"
                      aria-label={label}
                      type={
                        key === "adminPassword"
                          ? "password"
                          : typeof s[key] === "number"
                            ? "number"
                            : "text"
                      }
                      value={String(s[key])}
                      onChange={(e) =>
                        patch(
                          key,
                          typeof s[key] === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  )}
                </FieldRow>
              ))}
            </div>
          </section>
        ))}
        <section className="card">
          <div className="card-header">外观与运行状态</div>
          <div className="card-body">
            <FieldRow label="系统代理" hint="正常退出时恢复原设置">
              <Switch
                on={ui.systemProxy}
                onChange={() => void toggleGlobal("systemProxy")}
              />
            </FieldRow>
            <FieldRow label="主题">
              <Segmented
                value={ui.theme}
                onChange={ui.setTheme}
                options={[
                  { value: "system", label: "跟随系统" },
                  { value: "light", label: "浅色" },
                  { value: "dark", label: "深色" },
                ]}
              />
            </FieldRow>
          </div>
        </section>
      </div>
    </div>
  );
}
