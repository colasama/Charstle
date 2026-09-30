/**
 * 实时事件流：WS /api/events（对应 internal/events/bus.go）
 *
 * Core 每 ~100ms 合并一批事件推送一次，避免高流量时 UI 卡顿。
 * 这里只定义事件结构和订阅接口，实现待补。
 */
import type { Device, PausedItem, SessionSummary } from '../types';

export type ServerEvent =
  | { type: 'session.add'; items: SessionSummary[] }
  | { type: 'session.update'; items: Partial<SessionSummary> & { id: number }[] }
  | { type: 'session.clear' }
  | { type: 'device.pending'; device: Device }
  | { type: 'device.update'; device: Device }
  | { type: 'breakpoint.paused'; item: PausedItem }
  | { type: 'breakpoint.resolved'; id: string }
  | { type: 'stats'; sessions: number; memoryMB: number; rps: number };

export type Unsubscribe = () => void;

export function connectEvents(_onEvent: (e: ServerEvent) => void): Unsubscribe {
  // TODO(api): new WebSocket(`${location.origin.replace('http', 'ws')}/api/events`)，
  //            断线重连、按 type 分发到 store。
  return () => {};
}
