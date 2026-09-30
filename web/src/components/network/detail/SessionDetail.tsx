import { useState } from "react";
import {
  Copy,
  MoreHorizontal,
  OctagonPause,
  RotateCw,
  Send,
  Terminal,
  X,
  FlaskConical,
  FileSymlink,
  FileDown,
} from "lucide-react";
import type { SessionDetail as Detail } from "../../../types";
import { useUI } from "../../../store/ui";
import { Tabs } from "../../common/Tabs";
import { Dropdown } from "../../common/Menu";
import { MethodText, StatusText } from "../../common/Badges";
import { OverviewTab } from "./OverviewTab";
import { MessageTab } from "./MessageTab";
import { TimingTab } from "./TimingTab";
import { RuleHitsTab } from "./RuleHitsTab";
import { FramesTab } from "./FramesTab";
import { formatBytes, formatMs } from "../../../utils/format";

import { useNavigate } from "react-router-dom";
import { sessionAction } from "../../../api/sessionActions";
type TabKey =
  "overview" | "request" | "response" | "timing" | "rules" | "frames";

export function SessionDetail({ session }: { session: Detail }) {
  const [tab, setTab] = useState<TabKey>("response");
  const selectSession = useUI((s) => s.selectSession);
  const navigate = useNavigate();
  const act = (kind: string) => void sessionAction(kind, session, navigate);
  const isWs = session.type === "ws";

  return (
    <div className="detail">
      <div className="detail-head">
        <div className="detail-url">
          <MethodText method={session.method} />
          <span className="mono ellipsis" title={session.url}>
            {session.url}
          </span>
        </div>
        <div className="detail-meta">
          <StatusText status={session.status} state={session.state} />
          {session.statusText && (
            <span className="muted">{session.statusText}</span>
          )}
          <span className="faint">·</span>
          <span className="muted">{session.httpVersion}</span>
          <span className="faint">·</span>
          <span className="muted">{formatMs(session.duration)}</span>
          <span className="faint">·</span>
          <span className="muted">{formatBytes(session.resSize)}</span>
          {session.mocked && <span className="badge badge-purple">MOCK</span>}
          {session.remapped && (
            <span className="badge badge-accent">REMAP</span>
          )}
          {session.throttled && (
            <span className="badge badge-info">THROTTLED</span>
          )}
          {session.tls && !session.tls.intercepted && (
            <span className="badge">TUNNEL</span>
          )}
          <div className="spacer" />
          <div className="detail-actions">
            <button
              className="btn btn-ghost btn-icon btn-sm"
              data-tip="重放"
              onClick={() => act("replay")}
            >
              <RotateCw size={14} />
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              data-tip="编辑后发送"
              onClick={() => act("compose")}
            >
              <Send size={14} />
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              data-tip="复制为 cURL"
              onClick={() => act("curl")}
            >
              <Terminal size={14} />
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              data-tip="添加断点"
              onClick={() => act("breakpoint")}
            >
              <OctagonPause size={14} />
            </button>
            <Dropdown
              align="right"
              buttonClass="btn btn-ghost btn-icon btn-sm"
              trigger={<MoreHorizontal size={14} />}
              items={[
                {
                  label: "复制 URL",
                  onClick: () => act("url"),
                  icon: <Copy size={14} />,
                },
                {
                  label: "Map Local…",
                  onClick: () => act("file"),
                  icon: <FileSymlink size={14} />,
                },
                {
                  label: "用当前响应创建 Mock",
                  onClick: () => act("mock"),
                  icon: <FlaskConical size={14} />,
                },
                { type: "sep" },
                {
                  label: "导出为 HAR",
                  onClick: () => act("har"),
                  icon: <FileDown size={14} />,
                },
              ]}
            />
            <button
              className="btn btn-ghost btn-icon btn-sm"
              data-tip="关闭"
              onClick={() => selectSession(null)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <Tabs<TabKey>
        active={tab}
        onChange={setTab}
        items={[
          { key: "overview", label: "概览" },
          { key: "request", label: "请求" },
          { key: "response", label: "响应" },
          {
            key: "frames",
            label: "消息",
            badge: session.frames?.length,
            hidden: !isWs,
          },
          { key: "timing", label: "耗时" },
          {
            key: "rules",
            label: "规则",
            badge: session.ruleHits.length || undefined,
          },
        ]}
      />

      <div className="detail-body">
        {tab === "overview" && <OverviewTab s={session} />}
        {tab === "request" && <MessageTab s={session} kind="request" />}
        {tab === "response" && <MessageTab s={session} kind="response" />}
        {tab === "timing" && <TimingTab s={session} />}
        {tab === "rules" && <RuleHitsTab s={session} />}
        {tab === "frames" && isWs && (
          <FramesTab frames={session.frames ?? []} />
        )}
      </div>
    </div>
  );
}
