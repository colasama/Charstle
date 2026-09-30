import { PageHeader, FieldRow } from "../components/common/Controls";
import { AsyncButton } from "../components/common/AsyncButton";
import { StringList } from "../components/common/StringList";
import { PlatformIcon } from "../components/common/PlatformIcon";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { useData, perform } from "../store/data";
import { useUI } from "../store/ui";
import { api } from "../api/client";
import type { AccessMode } from "../types";
import { formatRelative } from "../utils/format";
export function DevicesPage() {
  const { devices, lan, proxyPort, access } = useData();
  const nav = useNavigate();
  const primary = lan.find((a) => a.primary) ?? lan[0];
  const addr = (primary?.ip ?? "127.0.0.1") + ":" + proxyPort;
  return (
    <div className="page">
      <PageHeader
        title="局域网设备"
        desc="将设备的 HTTP 代理设为本机地址，并安装根证书以解密 HTTPS。"
      />
      <div className="page-content">
        <div className="grid-2">
          <section className="card">
            <div className="card-header">接入本机</div>
            <div className="card-body connect-card">
              <QRCodeSVG value={"http://" + addr + "/ssl"} size={132} />
              <div className="col">
                {lan.map((a) => (
                  <AsyncButton
                    className="btn mono"
                    key={a.ip}
                    run={() =>
                      navigator.clipboard.writeText(a.ip + ":" + proxyPort)
                    }
                    message="地址已复制"
                  >
                    {a.ip}:{proxyPort} · {a.iface}
                  </AsyncButton>
                ))}
                <button
                  className="btn"
                  onClick={() =>
                    useUI.getState().openModal({ type: "connectGuide" })
                  }
                >
                  查看设置步骤
                </button>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="card-header">访问控制</div>
            <div className="card-body">
              <FieldRow label="新设备策略">
                <select
                  className="select"
                  value={access.mode}
                  onChange={(e) =>
                    void perform(() =>
                      api.saveAccessControl({
                        ...access,
                        mode: e.target.value as AccessMode,
                      }),
                    )
                  }
                >
                  <option value="ask">新设备需确认</option>
                  <option value="whitelist">仅白名单</option>
                  <option value="allowAll">允许所有</option>
                </select>
              </FieldRow>
              <FieldRow label="白名单">
                <StringList
                  items={access.whitelist}
                  placeholder="IP 或 CIDR"
                  onChange={(whitelist) =>
                    void perform(() =>
                      api.saveAccessControl({ ...access, whitelist }),
                    )
                  }
                />
              </FieldRow>
              <FieldRow label="黑名单">
                <StringList
                  items={access.blacklist ?? []}
                  placeholder="IP 或 CIDR"
                  onChange={(blacklist) =>
                    void perform(() =>
                      api.saveAccessControl({ ...access, blacklist }),
                    )
                  }
                />
              </FieldRow>
            </div>
          </section>
        </div>
        <section className="card">
          <div className="card-header">设备 · {devices.length}</div>
          <div className="card-body flush">
            <table className="table">
              <thead>
                <tr>
                  <th>设备</th>
                  <th>IP</th>
                  <th>状态</th>
                  <th>请求数</th>
                  <th>最近活动</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.ip}>
                    <td>
                      <PlatformIcon platform={d.platform} size={14} />{" "}
                      {d.name || d.platform}
                    </td>
                    <td className="mono">{d.ip}</td>
                    <td>
                      {d.status === "allowed"
                        ? "已允许"
                        : d.status === "blocked"
                          ? "已阻止"
                          : "待授权"}
                    </td>
                    <td>{d.requests}</td>
                    <td>{formatRelative(d.lastSeen)}</td>
                    <td>
                      <div className="row">
                        {d.status === "pending" ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              useUI
                                .getState()
                                .openModal({ type: "deviceApproval", ip: d.ip })
                            }
                          >
                            处理
                          </button>
                        ) : (
                          <AsyncButton
                            className="btn btn-sm"
                            disabled={d.isLocal}
                            run={() =>
                              api.setDeviceStatus(
                                d.ip,
                                d.status === "allowed" ? "blocked" : "allowed",
                                true,
                              )
                            }
                          >
                            {d.status === "allowed" ? "阻止" : "允许"}
                          </AsyncButton>
                        )}
                        <AsyncButton
                          className="btn btn-sm"
                          run={async () => {
                            const name = prompt("设备名称", d.name ?? "");
                            if (name !== null)
                              await api.renameDevice(d.ip, name);
                          }}
                        >
                          重命名
                        </AsyncButton>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            useUI.getState().setFilter({ clientIp: d.ip });
                            nav("/network");
                          }}
                        >
                          查看流量
                        </button>
                      </div>
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
