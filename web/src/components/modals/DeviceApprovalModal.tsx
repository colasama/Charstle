import { ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PlatformIcon, platformName } from '../common/PlatformIcon';
import { mockDevices } from '../../mock/data';

export function DeviceApprovalModal({ ip, onClose }: { ip: string; onClose: () => void }) {
  // TODO(api): api.setDeviceStatus(ip, 'allowed' | 'blocked', remember)
  const d = mockDevices.find((x) => x.ip === ip) ?? mockDevices[0];
  return (
    <Modal
      size="sm"
      title="新设备请求接入"
      icon={<ShieldAlert size={18} className="text-warning" />}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger" onClick={onClose}>
            拒绝
          </button>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            仅本次允许
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            始终允许
          </button>
        </>
      }
    >
      <div className="device-cell" style={{ padding: '8px 0 12px' }}>
        <span className="device-icon" style={{ width: 40, height: 40 }}>
          <PlatformIcon platform={d.platform} size={20} />
        </span>
        <div>
          <div className="device-name mono">{d.ip}</div>
          <div className="muted text-xs">
            {platformName[d.platform]} · {d.userAgent}
          </div>
        </div>
      </div>
      <p className="muted text-sm">
        允许后，该设备的所有流量会经过本机，并可能被解密查看。只允许你信任的设备。
      </p>
      <label className="check-label" style={{ marginTop: 12 }}>
        <input type="checkbox" defaultChecked /> 记住选择（写入白名单 / 黑名单）
      </label>
    </Modal>
  );
}
