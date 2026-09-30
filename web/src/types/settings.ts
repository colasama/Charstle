export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  // 基础
  proxyPort: number;
  listenAddr: string;
  adminPort: number;
  adminLanAccess: boolean;
  adminPassword: string;
  // 抓包
  maxSessions: number;
  maxMemoryMB: number;
  bodyCaptureLimitKB: number;
  spillDir: string;
  recordTunnels: boolean;
  // 协议
  http2: boolean;
  captureWebSocket: boolean;
  decodeBody: boolean;
  // 上游
  upstreamProxy: string;
  upstreamBypass: string;
  dnsServers: string;
  useHostsFile: boolean;
  // 系统代理
  systemProxyBypass: string;
}

export interface CAInfo {
  subject: string;
  keyType: string;
  sha256: string;
  notBefore: string;
  notAfter: string;
  path: string;
  installedOnHost: boolean;
}

export interface SslProxyingConfig {
  enabled: boolean;
  include: string[];
  exclude: string[];
}

/** 证书固定导致握手失败、被自动降级为隧道的域名 */
export interface PinnedHost {
  host: string;
  reason: string;
  failures: number;
  since: number;
  clientIp: string;
}
