import { useState } from "react";
import {
  Ban,
  Copy,
  Download,
  FileDown,
  FileUp,
  Gauge,
  Keyboard,
  Monitor,
  Moon,
  OctagonPause,
  QrCode,
  ShieldCheck,
  Sun,
  SunMoon,
  Globe,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useUI } from "../../store/ui";
import { Dropdown } from "../common/Menu";
import { Logo } from "./Logo";
import { cx } from "../../utils/format";
import { useData, perform, toggleGlobal } from "../../store/data";
import { api, download } from "../../api/client";

function TogglePill({
  on,
  onClick,
  icon,
  label,
  tone,
  tip,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: string;
  tip: string;
}) {
  return (
    <button
      className={cx("toggle-pill", on && "is-on", tone && `tone-${tone}`)}
      onClick={onClick}
      data-tip={tip}
    >
      {icon}
      {label}
    </button>
  );
}

export function Toolbar() {
  const ui = useUI();
  const [qrOpen, setQrOpen] = useState(false);
  const { lan, proxyPort } = useData();
  const primary = lan.find((a) => a.primary) ?? lan[0];
  const addr = (primary?.ip ?? "127.0.0.1") + ":" + proxyPort;

  const ThemeIcon =
    ui.theme === "light" ? Sun : ui.theme === "dark" ? Moon : SunMoon;

  return (
    <header className="toolbar">
      <div className="brand brand-wide">
        <Logo size={22} />
        <span className="brand-name">Charstle</span>
      </div>

      <button
        className={cx(
          "btn btn-ghost record-btn",
          ui.recording && "is-recording",
        )}
        onClick={() => void toggleGlobal("recording")}
        data-tip={ui.recording ? "停止录制 (Ctrl+R)" : "开始录制 (Ctrl+R)"}
      >
        <span className="record-dot" />
        {ui.recording ? "录制中" : "已暂停"}
      </button>
      <button
        className="btn btn-ghost btn-icon"
        data-tip="清空会话 (Ctrl+K)"
        onClick={() => void perform(() => api.clearSessions())}
      >
        <Ban size={16} />
      </button>

      <div className="vsep" />

      <TogglePill
        on={ui.sslProxying}
        onClick={() => void toggleGlobal("sslProxying")}
        icon={<ShieldCheck size={15} />}
        label="HTTPS 解密"
        tone="success"
        tip="SSL Proxying：解密 HTTPS 流量"
      />
      <TogglePill
        on={ui.breakpoints}
        onClick={() => void toggleGlobal("breakpoints")}
        icon={<OctagonPause size={15} />}
        label="断点"
        tone="warning"
        tip="启用断点规则"
      />
      <TogglePill
        on={ui.throttling}
        onClick={() => void toggleGlobal("throttling")}
        icon={<Gauge size={15} />}
        label="限速"
        tone="info"
        tip="全局网络限速"
      />
      <TogglePill
        on={ui.systemProxy}
        onClick={() => void toggleGlobal("systemProxy")}
        icon={<Monitor size={15} />}
        label="系统代理"
        tip="将本机系统代理指向 Charstle"
      />

      <div className="spacer" />

      <div className="menu-anchor">
        <div className="proxy-addr">
          <Globe size={13} className="muted" />
          <span className="label">代理</span>
          <span>{addr}</span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            data-tip="复制地址"
            onClick={() =>
              void perform(
                () => navigator.clipboard.writeText(addr),
                "地址已复制",
              )
            }
          >
            <Copy size={13} />
          </button>
          <button
            className={cx(
              "btn btn-ghost btn-icon btn-sm",
              qrOpen && "is-active",
            )}
            onClick={() => setQrOpen((o) => !o)}
            data-tip={qrOpen ? undefined : "手机扫码配置"}
          >
            <QrCode size={13} />
          </button>
        </div>
        {qrOpen && (
          <div className="popover qr-popover">
            <div className="qr-box">
              <QRCodeSVG value={`http://${addr}/ssl`} size={160} />
            </div>
            <div style={{ marginTop: 10, fontWeight: 600 }}>
              手机扫码安装证书
            </div>
            <div className="muted text-sm" style={{ marginTop: 4 }}>
              先在 Wi-Fi 设置中将 HTTP 代理设为
              <br />
              <span className="mono">{addr}</span>
            </div>
            <button
              className="btn btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                setQrOpen(false);
                ui.openModal({ type: "connectGuide" });
              }}
            >
              查看完整接入指引
            </button>
          </div>
        )}
      </div>

      <Dropdown
        align="right"
        tip="导入 / 导出"
        buttonClass="btn btn-ghost btn-icon"
        trigger={<Download size={16} />}
        items={[
          { type: "label", label: "HAR" },
          {
            label: "导出全部会话…",
            icon: <FileDown size={14} />,
            shortcut: "Ctrl+S",
            onClick: () =>
              void perform(async () =>
                download(await api.exportHar(), "charstle.har"),
              ),
          },
          {
            label: "导出选中会话…",
            icon: <FileDown size={14} />,
            disabled: ui.selectedSessionId == null,
            onClick: () =>
              void perform(async () => {
                if (ui.selectedSessionId != null)
                  download(
                    await api.exportHar([ui.selectedSessionId]),
                    "charstle-session.har",
                  );
              }),
          },
          {
            label: "导入 HAR…",
            icon: <FileUp size={14} />,
            onClick: () => ui.openModal({ type: "harImport" }),
          },
        ]}
      />
      <Dropdown
        align="right"
        tip="主题"
        buttonClass="btn btn-ghost btn-icon"
        trigger={<ThemeIcon size={16} />}
        items={[
          {
            label: "跟随系统",
            icon: <SunMoon size={14} />,
            onClick: () => ui.setTheme("system"),
          },
          {
            label: "浅色",
            icon: <Sun size={14} />,
            onClick: () => ui.setTheme("light"),
          },
          {
            label: "深色",
            icon: <Moon size={14} />,
            onClick: () => ui.setTheme("dark"),
          },
        ]}
      />
      <button
        className="btn btn-ghost btn-icon"
        data-tip="快捷键 (?)"
        onClick={() => ui.openModal({ type: "shortcuts" })}
      >
        <Keyboard size={16} />
      </button>
    </header>
  );
}
