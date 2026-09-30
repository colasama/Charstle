import { FolderOpen, Save } from 'lucide-react';
import { FieldRow, Segmented, Switch } from '../components/common/Controls';
import { useUI } from '../store/ui';
import { appInfo, mockSettings } from '../mock/data';

const sections = [
  { id: 'general', label: '基础' },
  { id: 'capture', label: '抓包' },
  { id: 'protocol', label: '协议' },
  { id: 'upstream', label: '上游与 DNS' },
  { id: 'sysproxy', label: '系统代理' },
  { id: 'appearance', label: '外观' },
  { id: 'about', label: '关于' },
];

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={`settings-${id}`} className="card settings-section">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {desc && <span className="card-subtitle">{desc}</span>}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { theme, setTheme, systemProxy, toggle } = useUI();
  // TODO(api): /api/settings
  const s = mockSettings;

  return (
    <div className="settings">
      <nav className="settings-nav">
        <div className="side-list">
          {sections.map((x) => (
            <button key={x.id} className="side-item" onClick={() => document.getElementById(`settings-${x.id}`)?.scrollIntoView({ behavior: 'smooth' })}>
              {x.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="settings-body">
        <header className="page-header">
          <div className="grow">
            <h1 className="page-title">设置</h1>
            <p className="page-desc">修改端口和监听地址后需要重启代理服务</p>
          </div>
          <button className="btn btn-primary">
            <Save size={14} /> 保存
          </button>
        </header>
        <div className="page-content">
          <Section id="general" title="基础">
            <FieldRow label="代理端口" hint="HTTP / HTTPS 代理共用">
              <input className="input mono" style={{ width: 120 }} defaultValue={s.proxyPort} />
            </FieldRow>
            <FieldRow label="监听地址" hint="0.0.0.0 允许局域网设备接入">
              <select className="select" style={{ width: 240 }} defaultValue={s.listenAddr}>
                <option value="0.0.0.0">0.0.0.0（所有网卡）</option>
                <option value="127.0.0.1">127.0.0.1（仅本机）</option>
                <option value="192.168.1.23">192.168.1.23（Wi-Fi）</option>
              </select>
            </FieldRow>
            <FieldRow label="管理界面端口">
              <input className="input mono" style={{ width: 120 }} defaultValue={s.adminPort} />
            </FieldRow>
            <FieldRow label="允许局域网访问管理界面" hint="开启后强烈建议设置访问密码">
              <Switch on={s.adminLanAccess} />
            </FieldRow>
            <FieldRow label="管理界面密码">
              <input className="input" type="password" placeholder="未设置" defaultValue={s.adminPassword} />
            </FieldRow>
          </Section>

          <Section id="capture" title="抓包">
            <FieldRow label="最多保留会话数" hint="超出后淘汰最旧的">
              <input className="input mono" style={{ width: 140 }} defaultValue={s.maxSessions} />
            </FieldRow>
            <FieldRow label="内存上限">
              <input className="input mono" style={{ width: 140 }} defaultValue={s.maxMemoryMB} />
              <span className="muted text-xs">MB</span>
            </FieldRow>
            <FieldRow label="单个 Body 捕获上限" hint="超出部分截断，不影响转发">
              <input className="input mono" style={{ width: 140 }} defaultValue={s.bodyCaptureLimitKB} />
              <span className="muted text-xs">KB</span>
            </FieldRow>
            <FieldRow label="大 Body 落盘目录">
              <input className="input mono" defaultValue={s.spillDir} />
              <button className="btn btn-icon" data-tip="选择目录">
                <FolderOpen size={14} />
              </button>
            </FieldRow>
            <FieldRow label="记录未解密的隧道">
              <Switch on={s.recordTunnels} />
            </FieldRow>
            <FieldRow label="断点超时自动放行">
              <input className="input mono" style={{ width: 140 }} defaultValue={300} />
              <span className="muted text-xs">秒</span>
            </FieldRow>
          </Section>

          <Section id="protocol" title="协议">
            <FieldRow label="HTTP/2" hint="与客户端和上游协商 h2">
              <Switch on={s.http2} />
            </FieldRow>
            <FieldRow label="捕获 WebSocket 消息">
              <Switch on={s.captureWebSocket} />
            </FieldRow>
            <FieldRow label="自动解码 Body" hint="gzip / br / zstd / deflate，仅影响展示">
              <Switch on={s.decodeBody} />
            </FieldRow>
          </Section>

          <Section id="upstream" title="上游与 DNS">
            <FieldRow label="上游代理" hint="例如 http://10.0.0.1:3128 或 socks5://…">
              <input className="input mono" placeholder="直连" defaultValue={s.upstreamProxy} />
            </FieldRow>
            <FieldRow label="不走上游代理">
              <input className="input mono" defaultValue={s.upstreamBypass} />
            </FieldRow>
            <FieldRow label="自定义 DNS" hint="逗号分隔，留空使用系统 DNS">
              <input className="input mono" placeholder="223.5.5.5, 8.8.8.8" defaultValue={s.dnsServers} />
            </FieldRow>
            <FieldRow label="读取系统 hosts 文件">
              <Switch on={s.useHostsFile} />
            </FieldRow>
          </Section>

          <Section id="sysproxy" title="系统代理" desc="将本机系统代理指向 Charstle">
            <FieldRow label="启用系统代理">
              <Switch on={systemProxy} onChange={() => toggle('systemProxy')} />
            </FieldRow>
            <FieldRow label="绕过列表">
              <input className="input mono" defaultValue={s.systemProxyBypass} />
            </FieldRow>
            <FieldRow label="退出时恢复原设置">
              <Switch on />
            </FieldRow>
          </Section>

          <Section id="appearance" title="外观">
            <FieldRow label="主题">
              <Segmented
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: '跟随系统' },
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                ]}
              />
            </FieldRow>
          </Section>

          <Section id="about" title="关于">
            <div className="about-grid">
              <span className="muted">版本</span>
              <span className="mono">
                {appInfo.version} ({appInfo.build})
              </span>
              <span className="muted">数据目录</span>
              <span className="mono">{appInfo.dataDir}</span>
            </div>
            <div className="row" style={{ marginTop: 12, marginBottom: 16 }}>
              <button className="btn btn-sm">
                <FolderOpen size={13} /> 打开数据目录
              </button>
              <button className="btn btn-sm">查看日志</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
