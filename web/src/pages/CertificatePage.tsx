import { useState } from 'react';
import { Download, FileBadge, RefreshCw, RotateCcw, ShieldCheck, ShieldAlert, TriangleAlert, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader, Switch } from '../components/common/Controls';
import { Tabs } from '../components/common/Tabs';
import { StringList } from '../components/common/StringList';
import { useUI } from '../store/ui';
import { mockCA, mockLanAddresses, mockPinnedHosts, mockSettings, mockSslProxying } from '../mock/data';
import { cx, formatRelative } from '../utils/format';

type Platform = 'windows' | 'macos' | 'ios' | 'android' | 'firefox';

const guides: Record<Platform, React.ReactNode[]> = {
  windows: [
    <>点击上方 <b>安装到本机</b>，或下载 <code>.crt</code> 后双击</>,
    <>选择 <b>安装证书 → 当前用户 → 将所有证书放入下列存储 → 受信任的根证书颁发机构</b></>,
    <>重启浏览器使证书生效</>,
  ],
  macos: [
    <>点击 <b>安装到本机</b>，或下载 <code>.pem</code> 后双击导入「钥匙串访问」</>,
    <>在「钥匙串访问 → 系统」中找到 <b>Charstle Root CA</b>，双击</>,
    <>展开 <b>信任</b>，将「使用此证书时」设为 <b>始终信任</b></>,
  ],
  ios: [
    <>Wi-Fi 代理指向本机后，用 <b>Safari</b> 访问 <code>http://charstle.pro</code></>,
    <>下载描述文件，进入 <b>设置 → 通用 → VPN 与设备管理</b> 安装</>,
    <>进入 <b>设置 → 通用 → 关于本机 → 证书信任设置</b>，打开 <b>Charstle Root CA</b> 的完全信任</>,
  ],
  android: [
    <>Wi-Fi 代理指向本机后，用浏览器访问 <code>http://charstle.pro</code> 下载证书</>,
    <>进入 <b>设置 → 安全 → 加密与凭据 → 安装证书 → CA 证书</b></>,
    <>Android 7+ 默认只有浏览器信任用户证书；App 需在 <code>network_security_config</code> 中信任用户证书，或使用 root 设备安装到系统证书目录</>,
  ],
  firefox: [
    <>Firefox 使用独立证书库：<b>设置 → 隐私与安全 → 证书 → 查看证书</b></>,
    <>在 <b>证书颁发机构</b> 中导入 <code>.pem</code>，勾选「信任由此证书颁发机构来标识网站」</>,
    <>或在 <code>about:config</code> 中启用 <code>security.enterprise_roots.enabled</code></>,
  ],
};

export function CertificatePage() {
  const { sslProxying, toggle } = useUI();
  const [platform, setPlatform] = useState<Platform>('ios');
  // TODO(api): /api/ca、/api/ssl-proxying、/api/pinned
  const ca = mockCA;
  const primary = mockLanAddresses.find((a) => a.primary) ?? mockLanAddresses[0];

  return (
    <div className="page">
      <PageHeader icon={<ShieldCheck size={18} />} title="HTTPS 与证书" desc="根证书用于解密 HTTPS 流量。只在你自己的设备上安装，并妥善保管私钥。" />
      <div className="page-content">
        <div className="grid-2">
          <section className="card">
            <div className="card-header">
              <span className="card-title">根证书</span>
            </div>
            <div className="card-body col" style={{ gap: 14 }}>
              <div className="ca-hero">
                <div className={cx('ca-badge', !ca.installedOnHost && 'is-warn')}>{ca.installedOnHost ? <ShieldCheck size={26} /> : <ShieldAlert size={26} />}</div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>Charstle Root CA</div>
                  <div className={cx('text-sm', ca.installedOnHost ? 'text-success' : 'text-warning')}>{ca.installedOnHost ? '已被本机系统信任' : '本机尚未信任此证书'}</div>
                </div>
              </div>
              <dl className="kv">
                <dt>主题</dt>
                <dd className="mono text-xs">{ca.subject}</dd>
                <dt>密钥</dt>
                <dd>{ca.keyType}</dd>
                <dt>有效期</dt>
                <dd>
                  {ca.notBefore} → {ca.notAfter}
                </dd>
                <dt>位置</dt>
                <dd className="mono text-xs">{ca.path}</dd>
                <dt>SHA-256</dt>
                <dd>
                  <div className="fingerprint">{ca.sha256}</div>
                </dd>
              </dl>
            </div>
            <div className="card-footer" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary">
                <ShieldCheck size={14} /> 安装到本机
              </button>
              <button className="btn">
                <Download size={14} /> .crt
              </button>
              <button className="btn">
                <Download size={14} /> .pem
              </button>
              <button className="btn">
                <FileBadge size={14} /> iOS 描述文件
              </button>
              <div className="spacer" />
              <button className="btn btn-danger" data-tip="旧证书会失效，所有设备需要重新安装">
                <RefreshCw size={14} /> 重新生成
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <span className="card-title">在其他设备上安装</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div className="col" style={{ alignItems: 'center', flex: 'none' }}>
                <div className="qr-frame">
                  <QRCodeSVG value={`http://${primary.ip}:${mockSettings.proxyPort}/ssl`} size={112} />
                </div>
                <span className="mono text-xs muted">charstle.pro</span>
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <Tabs<Platform>
                  size="sm"
                  active={platform}
                  onChange={setPlatform}
                  items={[
                    { key: 'ios', label: 'iOS' },
                    { key: 'android', label: 'Android' },
                    { key: 'windows', label: 'Windows' },
                    { key: 'macos', label: 'macOS' },
                    { key: 'firefox', label: 'Firefox' },
                  ]}
                />
                <ol className="guide-steps" style={{ marginTop: 14 }}>
                  {guides[platform].map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </div>

        <section className="card">
          <div className="card-header">
            <span className="card-title">SSL Proxying</span>
            <span className="card-subtitle">决定哪些域名进行 HTTPS 解密，未匹配的走隧道透传</span>
            <div className="spacer" />
            <span className="muted text-sm">{sslProxying ? '已开启' : '已关闭'}</span>
            <Switch on={sslProxying} onChange={() => toggle('sslProxying')} />
          </div>
          <div className="card-body grid-2">
            <div className="field">
              <span className="field-label">解密（Include）</span>
              <span className="field-hint">为空表示解密全部。支持 *.domain 和 :port</span>
              <StringList items={mockSslProxying.include} placeholder="*.example.com:443" />
            </div>
            <div className="field">
              <span className="field-label">不解密（Exclude）</span>
              <span className="field-hint">优先级高于 Include，常用于有证书固定的系统服务</span>
              <StringList items={mockSslProxying.exclude} placeholder="*.apple.com" />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <TriangleAlert size={15} className="text-warning" />
            <span className="card-title">证书固定自动降级</span>
            <span className="card-subtitle">客户端拒绝了代理证书，这些域名已临时改为隧道透传</span>
            <div className="spacer" />
            <button className="btn btn-sm">
              <Trash2 size={13} /> 全部清除
            </button>
          </div>
          <div className="card-body flush">
            <table className="table">
              <thead>
                <tr>
                  <th>域名</th>
                  <th>原因</th>
                  <th>失败次数</th>
                  <th>客户端</th>
                  <th>开始于</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {mockPinnedHosts.map((p) => (
                  <tr key={p.host}>
                    <td className="mono">{p.host}</td>
                    <td className="muted">{p.reason}</td>
                    <td className="mono">{p.failures}</td>
                    <td className="mono">{p.clientIp}</td>
                    <td className="muted">{formatRelative(p.since)}</td>
                    <td className="col-actions">
                      <button className="btn btn-sm btn-ghost">
                        <RotateCcw size={13} /> 重新尝试解密
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
