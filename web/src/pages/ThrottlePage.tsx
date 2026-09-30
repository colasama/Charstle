import { useState } from 'react';
import { Gauge, Info } from 'lucide-react';
import { PageHeader, Switch, Segmented } from '../components/common/Controls';
import { useUI } from '../store/ui';
import { throttleProfiles } from '../mock/data';
import { cx } from '../utils/format';

function fmtKbps(k: number) {
  return k >= 1000 ? `${(k / 1000).toFixed(k % 1000 ? 1 : 0)} Mbps` : `${k} kbps`;
}

function Slider({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  return (
    <div className="slider-row">
      <span className="field-label">{label}</span>
      <input type="range" min={0} max={max} defaultValue={value} />
      <span className="input-unit">
        <input className="input input-sm mono" defaultValue={value} />
        <span>{unit}</span>
      </span>
    </div>
  );
}

export function ThrottlePage() {
  const { throttling, toggle } = useUI();
  const [profileId, setProfileId] = useState('3g');
  const [scope, setScope] = useState<'all' | 'hosts'>('all');
  // TODO(api): /api/throttle
  const profile = throttleProfiles.find((p) => p.id === profileId)!;

  return (
    <div className="page">
      <PageHeader
        icon={<Gauge size={18} />}
        title="网络限速"
        desc="模拟弱网环境：限制带宽、增加延迟和丢包。规则里的 throttle:// 会对单个域名覆盖这里的设置。"
        actions={
          <>
            <span className="muted text-sm">{throttling ? '限速中' : '未启用'}</span>
            <Switch on={throttling} onChange={() => toggle('throttling')} />
          </>
        }
      />
      <div className="page-content">
        <section className="card">
          <div className="card-header">
            <span className="card-title">预设</span>
          </div>
          <div className="card-body">
            <div className="profile-grid">
              {throttleProfiles.map((p) => (
                <button key={p.id} className={cx('profile-card', p.id === profileId && 'is-active')} onClick={() => setProfileId(p.id)}>
                  <span className="profile-name">{p.name}</span>
                  <span className="profile-stats">
                    <span>下行</span>
                    <b>{fmtKbps(p.down)}</b>
                    <span>上行</span>
                    <b>{fmtKbps(p.up)}</b>
                    <span>延迟</span>
                    <b>{p.latency} ms</b>
                    <span>丢包</span>
                    <b>{p.loss}%</b>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid-2">
          <section className="card">
            <div className="card-header">
              <span className="card-title">参数</span>
              <span className="card-subtitle">{profile.builtin ? '修改预设参数会另存为「自定义」' : '自定义'}</span>
            </div>
            <div className="card-body" key={profile.id}>
              <Slider label="下行带宽" value={profile.down} max={10000} unit="kbps" />
              <Slider label="上行带宽" value={profile.up} max={10000} unit="kbps" />
              <Slider label="额外延迟" value={profile.latency} max={3000} unit="ms" />
              <Slider label="丢包率" value={profile.loss} max={50} unit="%" />
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <span className="card-title">作用范围</span>
            </div>
            <div className="card-body col" style={{ gap: 12 }}>
              <Segmented
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: '全部请求' },
                  { value: 'hosts', label: '仅指定域名' },
                ]}
              />
              <textarea
                className="textarea mono"
                rows={6}
                disabled={scope === 'all'}
                placeholder={'每行一个 pattern，例如：\n*.example.com\ncdn.example.net'}
                defaultValue={'cdn.example.com\n*.example.net'}
              />
              <div className="callout">
                <Info size={14} />
                限速作用在代理与上游之间；Mock 响应同样会按下行带宽限速。
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
