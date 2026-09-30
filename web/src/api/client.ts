/**
 * Admin API 客户端（对应 internal/api/routes.go）
 *
 * 这里只列出接口签名，实现待补。当前页面直接读取 src/mock/ 下的静态数据，
 * 接入时把页面里标了 `TODO(api)` 的地方替换为这里的调用即可。
 */
import type {
  BreakpointRule,
  CAInfo,
  Device,
  LanAddress,
  AccessMode,
  MockScript,
  ParsedRule,
  PinnedHost,
  RuleDiagnostic,
  RuleGroup,
  ScriptRunResult,
  SessionDetail,
  SessionSummary,
  Settings,
  SslProxyingConfig,
  ThrottleProfile,
  ValueItem,
  Header,
  HttpMethod,
} from '../types';

export const API_BASE = '/api';

function todo<T>(name: string): Promise<T> {
  return Promise.reject(new Error(`TODO: api.${name} 未实现`));
}

export interface SessionQuery {
  keyword?: string;
  offset?: number;
  limit?: number;
}

export interface ComposePayload {
  method: HttpMethod;
  url: string;
  headers: Header[];
  body: string;
  viaRules: boolean;
  followRedirects: boolean;
  timeoutMs: number;
}

export const api = {
  /* ---- 会话 ---- */
  listSessions: (_q: SessionQuery) => todo<SessionSummary[]>('listSessions'),
  getSession: (_id: number) => todo<SessionDetail>('getSession'),
  /** 原始 body，type=req|res，decode=true 时返回解码后的内容 */
  getBody: (_id: number, _type: 'req' | 'res', _decode = true) => todo<Blob>('getBody'),
  clearSessions: () => todo<void>('clearSessions'),
  replay: (_id: number) => todo<{ id: number }>('replay'),
  exportHar: (_ids?: number[]) => todo<Blob>('exportHar'),
  importHar: (_file: File) => todo<{ count: number }>('importHar'),
  copyAsCurl: (_id: number) => todo<string>('copyAsCurl'),

  /* ---- 录制 & 全局开关 ---- */
  setRecording: (_on: boolean) => todo<void>('setRecording'),
  setSystemProxy: (_on: boolean) => todo<void>('setSystemProxy'),

  /* ---- 规则 ---- */
  listRuleGroups: () => todo<RuleGroup[]>('listRuleGroups'),
  saveRuleGroup: (_g: Pick<RuleGroup, 'id' | 'name' | 'enabled' | 'content'>) =>
    todo<{ rules: ParsedRule[]; diagnostics: RuleDiagnostic[] }>('saveRuleGroup'),
  createRuleGroup: (_name: string) => todo<RuleGroup>('createRuleGroup'),
  deleteRuleGroup: (_id: string) => todo<void>('deleteRuleGroup'),
  reorderRuleGroups: (_ids: string[]) => todo<void>('reorderRuleGroups'),
  /** 仅做解析校验，不保存（编辑器实时诊断） */
  validateRules: (_content: string) => todo<RuleDiagnostic[]>('validateRules'),

  /* ---- Values ---- */
  listValues: () => todo<ValueItem[]>('listValues'),
  saveValue: (_v: Pick<ValueItem, 'key' | 'type' | 'content'>) => todo<void>('saveValue'),
  deleteValue: (_key: string) => todo<void>('deleteValue'),

  /* ---- Mock 脚本 ---- */
  listScripts: () => todo<MockScript[]>('listScripts'),
  saveScript: (_s: Pick<MockScript, 'name' | 'content'>) => todo<void>('saveScript'),
  deleteScript: (_name: string) => todo<void>('deleteScript'),
  runScript: (_name: string, _req: ComposePayload) => todo<ScriptRunResult>('runScript'),

  /* ---- 断点 ---- */
  listBreakpoints: () => todo<BreakpointRule[]>('listBreakpoints'),
  saveBreakpoints: (_list: BreakpointRule[]) => todo<void>('saveBreakpoints'),
  /** 对被拦截的请求/响应执行操作 */
  resolvePaused: (_id: string, _action: 'continue' | 'execute' | 'abort', _edited?: { method?: string; url?: string; status?: number; headers: Header[]; body: string }) =>
    todo<void>('resolvePaused'),

  /* ---- Compose ---- */
  compose: (_p: ComposePayload) => todo<SessionDetail>('compose'),

  /* ---- 限速 ---- */
  getThrottle: () => todo<{ enabled: boolean; profile: ThrottleProfile; hosts: string[] }>('getThrottle'),
  saveThrottle: (_c: { enabled: boolean; profile: ThrottleProfile; hosts: string[] }) => todo<void>('saveThrottle'),

  /* ---- 设备 / 局域网 ---- */
  listLanAddresses: () => todo<LanAddress[]>('listLanAddresses'),
  listDevices: () => todo<Device[]>('listDevices'),
  setDeviceStatus: (_ip: string, _status: Device['status'], _remember: boolean) => todo<void>('setDeviceStatus'),
  renameDevice: (_ip: string, _name: string) => todo<void>('renameDevice'),
  getAccessControl: () => todo<{ mode: AccessMode; whitelist: string[] }>('getAccessControl'),
  saveAccessControl: (_c: { mode: AccessMode; whitelist: string[] }) => todo<void>('saveAccessControl'),

  /* ---- 证书 / SSL ---- */
  getCA: () => todo<CAInfo>('getCA'),
  installCA: () => todo<void>('installCA'),
  regenerateCA: () => todo<CAInfo>('regenerateCA'),
  getSslProxying: () => todo<SslProxyingConfig>('getSslProxying'),
  saveSslProxying: (_c: SslProxyingConfig) => todo<void>('saveSslProxying'),
  listPinnedHosts: () => todo<PinnedHost[]>('listPinnedHosts'),
  clearPinnedHosts: (_hosts?: string[]) => todo<void>('clearPinnedHosts'),

  /* ---- 设置 ---- */
  getSettings: () => todo<Settings>('getSettings'),
  saveSettings: (_s: Partial<Settings>) => todo<void>('saveSettings'),
};

/** 证书相关的直接下载地址（由 Core 提供） */
export const downloadUrls = {
  caCrt: `${API_BASE}/ca/charstle-ca.crt`,
  caPem: `${API_BASE}/ca/charstle-ca.pem`,
  mobileconfig: `${API_BASE}/ca/charstle.mobileconfig`,
};
