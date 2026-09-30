import { useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../common/Modal';
import { Tabs } from '../common/Tabs';
import { mockLanAddresses, mockSettings } from '../../mock/data';

type P = 'ios' | 'android' | 'windows' | 'macos' | 'browser';

export function ConnectGuideModal({ onClose }: { onClose: () => void }) {
  const [p, setP] = useState<P>('ios');
  const ip = (mockLanAddresses.find((a) => a.primary) ?? mockLanAddresses[0]).ip;
  const port = mockSettings.proxyPort;
  const Code = ({ children }: { children: React.ReactNode }) => <code>{children}</code>;

  const steps: Record<P, React.ReactNode[]> = {
    ios: [
      <>设置 → 无线局域网 → 点击当前 Wi-Fi 的 ⓘ</>,
      <>
        配置代理 → 手动，服务器 <Code>{ip}</Code>，端口 <Code>{port}</Code>
      </>,
      <>Safari 访问 <Code>http://charstle.pro</Code> 安装证书，并在「证书信任设置」中开启完全信任</>,
    ],
    android: [
      <>设置 → WLAN → 长按当前网络 → 修改网络 → 高级选项</>,
      <>
        代理选择「手动」，主机名 <Code>{ip}</Code>，端口 <Code>{port}</Code>
      </>,
      <>浏览器访问 <Code>http://charstle.pro</Code> 下载证书并在安全设置中安装</>,
    ],
    windows: [
      <>工具栏打开「系统代理」即可自动配置本机</>,
      <>
        其他 Windows 电脑：设置 → 网络和 Internet → 代理 → 手动设置 <Code>{ip}:{port}</Code>
      </>,
      <>访问 <Code>http://charstle.pro</Code> 下载证书，安装到「受信任的根证书颁发机构」</>,
    ],
    macos: [
      <>系统设置 → 网络 → 当前网络 → 详细信息 → 代理</>,
      <>
        勾选「网页代理」和「安全网页代理」，填入 <Code>{ip}</Code> 与 <Code>{port}</Code>
      </>,
      <>下载证书后在「钥匙串访问」中设为始终信任</>,
    ],
    browser: [
      <>安装 SwitchyOmega 等代理切换扩展</>,
      <>
        新建 HTTP 代理情景模式：<Code>{ip}</Code> : <Code>{port}</Code>
      </>,
      <>
        或使用 PAC：<Code>{`http://${ip}:${port}/proxy.pac`}</Code>
      </>,
    ],
  };

  return (
    <Modal size="lg" title="设备接入指引" icon={<MonitorSmartphone size={18} className="muted" />} onClose={onClose}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div className="col" style={{ alignItems: 'center', flex: 'none' }}>
          <div className="qr-frame">
            <QRCodeSVG value={`http://${ip}:${port}/ssl`} size={148} />
          </div>
          <span className="mono text-sm" style={{ fontWeight: 600 }}>
            {ip}:{port}
          </span>
          <span className="muted text-xs">设置代理后扫码安装证书</span>
        </div>
        <div className="grow">
          <Tabs<P>
            active={p}
            onChange={setP}
            items={[
              { key: 'ios', label: 'iOS' },
              { key: 'android', label: 'Android' },
              { key: 'windows', label: 'Windows' },
              { key: 'macos', label: 'macOS' },
              { key: 'browser', label: '浏览器扩展 / PAC' },
            ]}
          />
          <ol className="guide-steps" style={{ marginTop: 16 }}>
            {steps[p].map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  );
}
