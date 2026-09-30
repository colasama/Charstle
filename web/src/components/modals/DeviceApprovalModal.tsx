import { useState } from "react";
import { Modal } from "../common/Modal";
import { AsyncButton } from "../common/AsyncButton";
import { api } from "../../api/client";
import { useData } from "../../store/data";
export function DeviceApprovalModal({
  ip,
  onClose,
}: {
  ip: string;
  onClose: () => void;
}) {
  const device = useData((s) => s.devices.find((d) => d.ip === ip));
  const [remember, setRemember] = useState(true);
  const decide = async (status: "allowed" | "blocked") => {
    await api.setDeviceStatus(ip, status, remember);
    onClose();
  };
  return (
    <Modal
      title="设备请求接入"
      onClose={onClose}
      footer={
        <>
          <AsyncButton className="btn btn-danger" run={() => decide("blocked")}>
            拒绝
          </AsyncButton>
          <AsyncButton
            className="btn btn-primary"
            run={() => decide("allowed")}
          >
            允许
          </AsyncButton>
        </>
      }
    >
      <p className="mono">{ip}</p>
      <p>{device?.userAgent}</p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        记住此 IP 的决定
      </label>
    </Modal>
  );
}
