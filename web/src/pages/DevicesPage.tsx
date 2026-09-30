import { useState } from 'react';
import { Ban, Check, Copy, Filter, MonitorSmartphone, MoreHorizontal, Pencil, ShieldAlert, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '../components/common/Controls';
import { StringList } from '../components/common/StringList';
import { PlatformIcon, platformName } from '../components/common/PlatformIcon';
import { Dropdown } from '../components/common/Menu';
import { useUI } from '../store/ui';
import { mockDevices, mockLanAddresses, mockSettings, mockWhitelist } from '../mock/data';
import type { AccessMode, DeviceStatus } from '../types';
import { cx, formatBytes, formatNumber, formatRelative } from '../utils/format';

const statusBadge: Record<DeviceStatus, [string, string]> = {
  allowed: ['badge-success', '已允许'],
  blocked: ['badge-danger', '已拒绝'],
  pending: ['badge-warning', '待授权'],
};

const modes: { value: AccessMode; title: string; desc: string }[] = [
  { value: 'ask', title: '新设备需确认（推荐）', desc: '未知 IP 首次连接时弹窗询问，允许后记住' },
  { value: 'whitelist', title: '仅白名单', desc: '只接受白名单内的 IP / 网段，其余直接断开' },
  { value: 'allowAll', title: '允许所有', desc: '任何能访问本机端口的设备都可使用代理，不安全' },
];

export function DevicesPage() {
  const openModal = useUI((s) => s.openModal);
  const setFilter = useUI((s) => s.setFilter);
  const [mode, setMode] = useState<AccessMode>('ask');
  // TODO(api): /api/lan、/api/devices、/api/access
  const primary = mockLanAddresses.find((a) => a.primary) ?? mockLanAddresses[0];
  const port = mockSettings.proxyPort;
  const pending = mockDevices.filter((d) => d.status === 'pending');

  return (
    <div className="page">
      <PageHeader icon={<MonitorSmartphone size={18} />} title="局域网设备" desc="让手机、平板或其他电脑通过本机代理上网，并集中抓包与调试。" />
      <div className="page-content">
        {pending.map((d) => (
          <div key={d.ip} className="pending-banner">
            <ShieldAlert size={18} className="text-warning" />
            <div className="grow">
              <b>新设备请求接入：</b>
              <span className="mono">{d.ip}</span>
              <span className="muted"> · {d.userAgent}</span>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => openModal({ type: 'deviceApproval', ip: d.ip })}>
              处理
            </button>
          </div>
        ))}

        <div className="grid-2">
          <section className="card">
            <div className="card-header">
              <span className="card-title">接入本机</span>
              <div className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => openModal({ type: 'connectGuide' })}>
                各平台设置方法
              </button>
            </div>
            <div className="card-body connect-card">
              <div className="col" style={{ alignItems: 'center' }}>
                <div className="qr-frame">
                  <QRCodeSVG value={`http://${primary.ip}:${port}/ssl`} size={132} />
                </div>
                <span className="muted text-xs">扫码打开证书安装页</span>
              </div>
              <div className="col" style={{ gap: 12 }}>
                <div className="addr-list">
                  {mockLanAddresses.map((a) => (
                    <div key={a.ip} className={cx('addr-row', a.primary && 'is-primary')}>
                      {a.primary && <Star size={12} className="text-warning" />}
                      <span className="mono">
                        {a.ip}:{port}
                      </span>
                      <span className="muted text-xs grow">{a.iface}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" data-tip="复制">
                        <Copy size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <ol className="steps">
                  <li>手机与电脑连接同一 Wi-Fi</li>
                  <li>
                    Wi-Fi 详情 → HTTP 代理 → 手动，填入 <code>{primary.ip}</code> 和 <code>{port}</code>
                  </li>
                  <li>
                    浏览器访问 <code>http://charstle.pro</code> 安装并信任证书
                  </li>
                </ol>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <span className="card-title">访问控制</span>
            </div>
            <div className="card-body col" style={{ gap: 12 }}>
              <div className="radio-cards">
                {modes.map((m) => (
                  <label key={m.value} className={cx('radio-card', mode === m.value && 'is-active')}>
                    <input type="radio" name="access" checked={mode === m.value} onChange={() => setMode(m.value)} />
                    <div>
                      <div className="radio-card-title">{m.title}</div>
                      <div className="radio-card-desc">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="field">
                <span className="field-label">白名单（IP / CIDR）</span>
                <StringList items={mockWhitelist} placeholder="例如 192.168.1.0/24" />
              </div>
            </div>
          </section>
        </div>

        <section className="card">
          <div className="card-header">
            <span className="card-title">设备</span>
            <span className="card-subtitle">{mockDevices.length} 台</span>
          </div>
          <div className="card-body flush">
            <table className="table">
              <thead>
                <tr>
                  <th>设备</th>
                  <th>IP</th>
                  <th>状态</th>
                  <th>请求数</th>
                  <th>流量</th>
                  <th>最近活动</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {mockDevices.map((d) => (
                  <tr key={d.ip}>
                    <td>
                      <div className="device-cell">
                        <span className="device-icon">
                          <PlatformIcon platform={d.platform} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="device-name">
                            {d.name ?? <span className="muted">未命名</span>} {d.isLocal && <span className="badge">本机</span>}
                          </div>
                          <div className="device-ua ellipsis">
                            {platformName[d.platform]} · {d.userAgent}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{d.ip}</td>
                    <td>
                      <span className={`badge ${statusBadge[d.status][0]}`}>{statusBadge[d.status][1]}</span>
                    </td>
                    <td className="mono">{formatNumber(d.requests)}</td>
                    <td className="mono">{formatBytes(d.bytes)}</td>
                    <td className="muted">{formatRelative(d.lastSeen)}</td>
                    <td className="col-actions">
                      {d.status === 'pending' ? (
                        <>
                          <button className="btn btn-sm btn-primary">
                            <Check size={13} /> 允许
                          </button>{' '}
                          <button className="btn btn-sm btn-danger">
                            <Ban size={13} /> 拒绝
                          </button>
                        </>
                      ) : (
                        <Dropdown
                          align="right"
                          buttonClass="btn btn-ghost btn-icon btn-sm"
                          trigger={<MoreHorizontal size={14} />}
                          items={[
                            { label: '只看该设备的会话', icon: <Filter size={14} />, onClick: () => setFilter({ clientIp: d.ip }) },
                            { label: '重命名', icon: <Pencil size={14} /> },
                            { type: 'sep' },
                            d.status === 'blocked'
                              ? { label: '允许', icon: <Check size={14} /> }
                              : { label: '拒绝并断开', icon: <Ban size={14} />, danger: true },
                          ]}
                        />
                      )}
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
