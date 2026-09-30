import {
  PageHeader,
  FieldRow,
  Switch,
  EmptyState,
} from "../components/common/Controls";
import { StringList } from "../components/common/StringList";
import { AsyncButton } from "../components/common/AsyncButton";
import { useData, perform } from "../store/data";
import { api, downloadUrls } from "../api/client";
export function CertificatePage() {
  const { ca, ssl, pinned } = useData();
  if (!ca) return <EmptyState title="正在加载证书…" />;
  return (
    <div className="page">
      <PageHeader
        title="HTTPS 证书"
        desc="在需要解密流量的设备上安装并信任 Charstle 根证书。"
      />
      <div className="page-content">
        <section className="card">
          <div className="card-header">
            <b>本机根证书</b>
            <span className="badge">
              {ca.installedOnHost ? "已信任" : "未信任"}
            </span>
          </div>
          <div className="card-body">
            <FieldRow label="名称">{ca.subject}</FieldRow>
            <FieldRow label="有效期">
              {ca.notBefore.slice(0, 10)} — {ca.notAfter.slice(0, 10)}
            </FieldRow>
            <FieldRow label="SHA-256">
              <code style={{ overflowWrap: "anywhere" }}>{ca.sha256}</code>
            </FieldRow>
            <FieldRow label="证书文件">
              <code>{ca.path}</code>
            </FieldRow>
            <div className="row">
              <a className="btn" href={downloadUrls.caCrt} download>
                下载 CRT
              </a>
              <a className="btn" href={downloadUrls.caPem} download>
                下载 PEM
              </a>
              <a className="btn" href={downloadUrls.mobileconfig} download>
                iOS 描述文件
              </a>
              <AsyncButton
                className="btn btn-primary"
                run={async () => {
                  if (confirm("将 Charstle CA 安装到本机信任库？"))
                    await api.installCA();
                }}
                message="证书安装已完成"
              >
                安装到本机
              </AsyncButton>
              <AsyncButton
                className="btn"
                run={async () => {
                  if (confirm("重新生成后，所有设备都必须重新安装证书。继续？"))
                    await api.regenerateCA();
                }}
              >
                重新生成 CA
              </AsyncButton>
            </div>
            <p className="muted">
              iOS 安装描述文件后，还需在「设置 → 通用 → 关于本机 →
              证书信任设置」中开启完全信任。Android 应用可能不信任用户证书。
            </p>
          </div>
        </section>
        <section className="card">
          <div className="card-header">SSL Proxying</div>
          <div className="card-body">
            <FieldRow label="启用 HTTPS 解密">
              <Switch
                on={ssl.enabled}
                onChange={(enabled) =>
                  void perform(() => api.saveSslProxying({ ...ssl, enabled }))
                }
              />
            </FieldRow>
            <FieldRow label="仅解密这些域名" hint="留空表示全部">
              <StringList
                items={ssl.include}
                placeholder="*.example.com:443"
                onChange={(include) =>
                  void perform(() => api.saveSslProxying({ ...ssl, include }))
                }
              />
            </FieldRow>
            <FieldRow label="排除这些域名" hint="排除优先于包含">
              <StringList
                items={ssl.exclude}
                placeholder="*.apple.com"
                onChange={(exclude) =>
                  void perform(() => api.saveSslProxying({ ...ssl, exclude }))
                }
              />
            </FieldRow>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <b className="grow">客户端证书拒绝记录</b>
            <AsyncButton
              className="btn btn-sm"
              run={() => api.clearPinnedHosts()}
            >
              全部清除
            </AsyncButton>
          </div>
          <div className="card-body">
            <p className="muted">
              连续拒绝证书后，后续连接会自动转为隧道透传。
            </p>
            {pinned.map((p) => (
              <div className="field-row" key={p.host}>
                <code>{p.host}</code>
                <span className="grow">
                  {p.reason} · {p.failures} 次
                </span>
                <AsyncButton
                  className="btn btn-sm"
                  run={() => api.clearPinnedHosts([p.host])}
                >
                  重新尝试解密
                </AsyncButton>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
