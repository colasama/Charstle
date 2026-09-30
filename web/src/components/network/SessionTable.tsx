import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
} from 'lucide-react';
import type { SessionSummary } from '../../types';
import { useUI } from '../../store/ui';
import { MethodText, SessionFlags, StatusText } from '../common/Badges';
import { ContextMenu, type MenuEntry } from '../common/Menu';
import { cx, formatBytes, formatMs, formatTime } from '../../utils/format';

const ROW_H = 26;

interface Props {
  sessions: SessionSummary[];
}

export function SessionTable({ sessions }: Props) {
  const { selectedSessionId, selectSession } = useUI();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: number } | null>(null);

  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 20,
  });

  // 瀑布图时间范围
  const t0 = sessions[0]?.startedAt ?? 0;
  const t1 = Math.max(...sessions.map((s) => s.startedAt + (s.duration ?? 0)), t0 + 1);
  const span = t1 - t0;

  // TODO: 各菜单项的实际动作
  const menuItems: MenuEntry[] = [
    { label: '复制 URL', icon: <Copy size={14} />, shortcut: 'Ctrl+C' },
    { label: '复制为 cURL', icon: <Terminal size={14} /> },
    { type: 'sep' },
    { label: '重放', icon: <RotateCw size={14} />, shortcut: 'R' },
    { label: '编辑后发送（Compose）', icon: <Send size={14} />, shortcut: 'E' },
    { label: '添加断点', icon: <OctagonPause size={14} /> },
    { type: 'sep' },
    { type: 'label', label: '快速创建规则' },
    { label: 'Map Local…', icon: <FileSymlink size={14} /> },
    { label: 'Map Remote…', icon: <Route size={14} /> },
    { label: '用当前响应创建 Mock', icon: <FlaskConical size={14} /> },
    { label: '在规则中查看命中', icon: <Waypoints size={14} /> },
    { label: '阻止该域名', icon: <Ban size={14} /> },
    { label: '对该域名关闭 HTTPS 解密', icon: <ShieldOff size={14} /> },
    { type: 'sep' },
    { label: '导出为 HAR', icon: <FileDown size={14} /> },
    { label: '删除', icon: <Trash2 size={14} />, danger: true, shortcut: 'Del' },
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
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const s = sessions[vi.index];
            const left = ((s.startedAt - t0) / span) * 100;
            const width = Math.max(((s.duration ?? span * 0.02) / span) * 100, 0.8);
            return (
              <div
                key={s.id}
                className={cx(
                  'st-row',
                  selectedSessionId === s.id && 'is-selected',
                  s.state === 'error' && 'is-error',
                  s.state === 'tunnel' && 'is-tunnel',
                  s.state === 'paused' && 'is-paused',
                  s.hits > 0 && 'has-hits',
                )}
                style={{ transform: `translateY(${vi.start}px)`, height: ROW_H }}
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
                  {s.hits > 0 && <span className="st-hit" data-tip={`命中 ${s.hits} 条规则`}>{s.hits}</span>}
                </span>
                <span className="muted">{s.type}</span>
                <span className="num muted">{formatBytes(s.resSize)}</span>
                <span className="num">{s.state === 'pending' ? <span className="faint">···</span> : formatMs(s.duration)}</span>
                <span className="muted ellipsis">{s.clientIp}</span>
                <span className="st-wf" title={formatTime(s.startedAt)}>
                  <i className={cx(s.state === 'pending' && 'is-pending', s.mocked && 'is-mock')} style={{ left: `${left}%`, width: `${width}%` }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
}
