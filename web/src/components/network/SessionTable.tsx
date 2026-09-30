import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Copy,
  FileDown,
  FileSymlink,
  FlaskConical,
  OctagonPause,
  RotateCw,
  Route,
  Send,
  ShieldOff,
  Terminal,
  Trash2,
  Ban,
  Waypoints,
} from "lucide-react";
import type { SessionSummary } from "../../types";
import { useUI } from "../../store/ui";
import { MethodText, SessionFlags, StatusText } from "../common/Badges";
import { ContextMenu, type MenuEntry } from "../common/Menu";
import { cx, formatBytes, formatMs, formatTime } from "../../utils/format";

import { useNavigate } from "react-router-dom";
import { sessionAction } from "../../api/sessionActions";
const ROW_H = 26;

interface Props {
  sessions: SessionSummary[];
}

export function SessionTable({ sessions }: Props) {
  const { selectedSessionId, selectSession } = useUI();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: number } | null>(
    null,
  );

  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 20,
  });

  // 瀑布图时间范围
  const t0 = Math.min(...sessions.map((s) => s.startedAt), Date.now());
  const t1 = Math.max(
    ...sessions.map((s) => s.startedAt + (s.duration ?? 0)),
    t0 + 1,
  );
  const span = t1 - t0;

  const navigate = useNavigate();
  const act = (kind: string) => {
    const s = sessions.find((s) => s.id === (menu?.id ?? selectedSessionId));
    if (s) void sessionAction(kind, s, navigate);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,[contenteditable=true]",
        )
      )
        return;
      const s = sessions.find((s) => s.id === selectedSessionId);
      if (!s) return;
      const commands: Record<string, string> = {
        r: "replay",
        e: "compose",
        Delete: "delete",
      };
      if (commands[e.key] && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        void sessionAction(commands[e.key], s, navigate);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        void sessionAction("url", s, navigate);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const i = sessions.indexOf(s) + (e.key === "ArrowDown" ? 1 : -1);
        if (sessions[i]) {
          selectSession(sessions[i].id);
          virtualizer.scrollToIndex(i);
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [sessions, selectedSessionId, navigate, selectSession, virtualizer]);
  const menuItems: MenuEntry[] = [
    {
      label: "复制 URL",
      onClick: () => act("url"),
      icon: <Copy size={14} />,
      shortcut: "Ctrl+C",
    },
    {
      label: "复制为 cURL",
      onClick: () => act("curl"),
      icon: <Terminal size={14} />,
    },
    { type: "sep" },
    {
      label: "重放",
      onClick: () => act("replay"),
      icon: <RotateCw size={14} />,
      shortcut: "R",
    },
    {
      label: "编辑后发送（Compose）",
      onClick: () => act("compose"),
      icon: <Send size={14} />,
      shortcut: "E",
    },
    {
      label: "添加断点",
      onClick: () => act("breakpoint"),
      icon: <OctagonPause size={14} />,
    },
    { type: "sep" },
    { type: "label", label: "快速创建规则" },
    {
      label: "Map Local…",
      onClick: () => act("file"),
      icon: <FileSymlink size={14} />,
    },
    {
      label: "Map Remote…",
      onClick: () => act("remote"),
      icon: <Route size={14} />,
    },
    {
      label: "用当前响应创建 Mock",
      onClick: () => act("mock"),
      icon: <FlaskConical size={14} />,
    },
    {
      label: "在规则中查看命中",
      onClick: () => act("rules"),
      icon: <Waypoints size={14} />,
    },
    {
      label: "阻止该域名",
      onClick: () => act("block"),
      icon: <Ban size={14} />,
    },
    {
      label: "对该域名关闭 HTTPS 解密",
      onClick: () => act("ssl"),
      icon: <ShieldOff size={14} />,
    },
    { type: "sep" },
    {
      label: "导出为 HAR",
      onClick: () => act("har"),
      icon: <FileDown size={14} />,
    },
    {
      label: "删除",
      onClick: () => act("delete"),
      icon: <Trash2 size={14} />,
      danger: true,
      shortcut: "Del",
    },
  ];

  return (
    <div className="session-table">
      <div className="st-row st-head">
        <span />
        <span>#</span>
        <span>状态</span>
        <span>方法</span>
        <span>Host</span>
        <span>路径</span>
        <span>类型</span>
        <span className="num">大小</span>
        <span className="num">耗时</span>
        <span>客户端</span>
        <span>时间线</span>
      </div>
      <div className="st-body" ref={scrollRef}>
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const s = sessions[vi.index];
            const left = ((s.startedAt - t0) / span) * 100;
            const width = Math.max(
              ((s.duration ?? span * 0.02) / span) * 100,
              0.8,
            );
            return (
              <div
                key={s.id}
                className={cx(
                  "st-row",
                  selectedSessionId === s.id && "is-selected",
                  s.state === "error" && "is-error",
                  s.state === "tunnel" && "is-tunnel",
                  s.state === "paused" && "is-paused",
                  s.hits > 0 && "has-hits",
                )}
                style={{
                  transform: `translateY(${vi.start}px)`,
                  height: ROW_H,
                }}
                onClick={() => selectSession(s.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  selectSession(s.id);
                  setMenu({ x: e.clientX, y: e.clientY, id: s.id });
                }}
              >
                <SessionFlags s={s} />
                <span className="faint">{s.id}</span>
                <StatusText status={s.status} state={s.state} />
                <MethodText method={s.method} />
                <span className="ellipsis st-host" title={s.host}>
                  {s.host}
                </span>
                <span className="ellipsis st-path" title={s.path}>
                  {s.path || <span className="faint">(tunnel)</span>}
                  {s.hits > 0 && (
                    <span className="st-hit" data-tip={`命中 ${s.hits} 条规则`}>
                      {s.hits}
                    </span>
                  )}
                </span>
                <span className="muted">{s.type}</span>
                <span className="num muted">{formatBytes(s.resSize)}</span>
                <span className="num">
                  {s.state === "pending" ? (
                    <span className="faint">···</span>
                  ) : (
                    formatMs(s.duration)
                  )}
                </span>
                <span className="muted ellipsis">{s.clientIp}</span>
                <span className="st-wf" title={formatTime(s.startedAt)}>
                  <i
                    className={cx(
                      s.state === "pending" && "is-pending",
                      s.mocked && "is-mock",
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
