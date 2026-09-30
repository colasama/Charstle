import { Cpu, Gauge, Layers, MonitorSmartphone, ShieldCheck, Waypoints } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../store/ui';
import { appInfo, mockDevices, mockRuleGroups } from '../../mock/data';
import { formatNumber } from '../../utils/format';
import { cx } from '../../utils/format';

export function StatusBar() {
  const ui = useUI();
  const nav = useNavigate();
  // TODO(api): 统计数据来自事件流 { type: 'stats' }
  const activeGroups = mockRuleGroups.filter((g) => g.enabled).length;
  const onlineDevices = mockDevices.filter((d) => d.status === 'allowed').length;

  return (
    <footer className="statusbar">
      <span className="statusbar-item">
        <span className={cx('dot', ui.recording ? 'dot-danger dot-pulse' : '')} />
        {ui.recording ? '录制中' : '已暂停'}
      </span>
      <span className="statusbar-item">
        <Layers size={12} />
        <b>{formatNumber(appInfo.sessions)}</b> 个会话
      </span>
      <span className="statusbar-item">
        <Cpu size={12} />
        <b>{appInfo.memoryMB} MB</b>
      </span>
      <button className="statusbar-item" onClick={() => nav('/rules')}>
        <Waypoints size={12} />
        <b>{activeGroups}</b> 组规则生效
      </button>

      <div className="spacer" />

      {ui.throttling && (
        <button className="statusbar-item text-warning" onClick={() => nav('/throttle')}>
          <Gauge size={12} /> 限速：3G
        </button>
      )}
      <button className="statusbar-item" onClick={() => nav('/ssl')}>
        <ShieldCheck size={12} className={ui.sslProxying ? 'text-success' : ''} />
        {ui.sslProxying ? 'HTTPS 解密已开启' : 'HTTPS 解密已关闭'}
      </button>
      <button className="statusbar-item" onClick={() => nav('/devices')}>
        <MonitorSmartphone size={12} />
        <b>{onlineDevices}</b> 台设备
      </button>
      <span className="statusbar-item faint">v{appInfo.version}</span>
    </footer>
  );
}
