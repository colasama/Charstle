import type { Header, HttpMethod } from './session';

export interface BreakpointRule {
  id: string;
  enabled: boolean;
  pattern: string;
  method: HttpMethod | '*';
  request: boolean;
  response: boolean;
  hitCount: number;
}

/** 当前被断点拦截、等待用户处理的请求 */
export interface PausedItem {
  id: string;
  sessionId: number;
  phase: 'request' | 'response';
  method: HttpMethod;
  url: string;
  clientIp: string;
  device?: string;
  pausedAt: number;
  status?: number;
  headers: Header[];
  body: string;
}

export interface ThrottleProfile {
  id: string;
  name: string;
  /** kbps */
  down: number;
  up: number;
  /** ms */
  latency: number;
  /** % */
  loss: number;
  builtin?: boolean;
}

export interface ComposeHistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  status?: number;
  duration?: number;
  at: number;
}
