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
  PausedItem,
} from "../types";
export const API_BASE = "/api";
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
export type ThrottleConfig = {
  enabled: boolean;
  profile: ThrottleProfile;
  hosts: string[];
};
export type GlobalState = {
  proxyPort: number;
  adminPort: number;
  recording: boolean;
  sslProxying: boolean;
  breakpoints: boolean;
  throttling: boolean;
  systemProxy: boolean;
};
const key = encodeURIComponent;
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  mode: "json" | "blob" = "json",
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || res.statusText);
  }
  return (
    mode === "blob" ? res.blob() : res.status === 204 ? undefined : res.json()
  ) as Promise<T>;
}
export function headerMap(headers: Header[]) {
  const out: Record<string, string[]> = {};
  for (const h of headers) {
    if (h.enabled !== false && h.name.trim()) {
      (out[h.name] ??= []).push(h.value);
    }
  }
  return out;
}
export function headerList(h: Record<string, string[]>): Header[] {
  return Object.entries(h ?? {}).flatMap(([name, vs]) =>
    vs.map((value) => ({ name, value })),
  );
}
const composeBody = (v: ComposePayload) => ({
  ...v,
  headers: headerMap(v.headers),
});
export const api = {
  state: () => request<GlobalState>("/state"),
  listSessions: (q: SessionQuery = {}) =>
    request<SessionSummary[]>(
      "/sessions?" +
        new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)])),
    ),
  getSession: (id: number) => request<SessionDetail>("/sessions/" + id),
  getBody: (id: number, type: "req" | "res", decode = true) =>
    request<Blob>(
      `/sessions/${id}/body/${type}?decode=${decode ? 1 : 0}`,
      "GET",
      undefined,
      "blob",
    ),
  clearSessions: () => request<void>("/sessions", "DELETE"),
  deleteSession: (id: number) => request<void>("/sessions/" + id, "DELETE"),
  replay: (id: number) =>
    request<{ id: number }>(`/sessions/${id}/replay`, "POST", {}),
  exportHar: (ids?: number[]) =>
    request<Blob>(
      "/har" + (ids ? "?ids=" + ids.join(",") : ""),
      "GET",
      undefined,
      "blob",
    ),
  importHar: async (file: File) => {
    const data = JSON.parse(await file.text());
    return request<{ count: number }>("/har", "POST", data);
  },
  copyAsCurl: (id: number) => request<string>(`/sessions/${id}/curl`),
  setRecording: (on: boolean) => request<void>("/recording", "PUT", { on }),
  setSystemProxy: (on: boolean) =>
    request<void>("/system-proxy", "PUT", { on }),
  setBreakpointsEnabled: (on: boolean) =>
    request<void>("/breakpoints/enabled", "PUT", { on }),
  parseRules: (g: Pick<RuleGroup, "id" | "name" | "enabled" | "content">) =>
    request<{ rules: ParsedRule[]; diagnostics: RuleDiagnostic[] }>(
      "/rules/parse",
      "POST",
      g,
    ),
  listRuleGroups: () => request<RuleGroup[]>("/rules"),
  saveRuleGroup: (g: Pick<RuleGroup, "id" | "name" | "enabled" | "content">) =>
    request<{ rules: ParsedRule[]; diagnostics: RuleDiagnostic[] }>(
      "/rules/" + key(g.id),
      "PUT",
      g,
    ),
  createRuleGroup: (name: string) =>
    request<RuleGroup>("/rules", "POST", { name }),
  deleteRuleGroup: (id: string) => request<void>("/rules/" + key(id), "DELETE"),
  reorderRuleGroups: (ids: string[]) =>
    request<void>("/rules/order", "PUT", ids),
  validateRules: (content: string) =>
    request<RuleDiagnostic[]>("/rules/validate", "POST", { content }),
  listValues: () => request<ValueItem[]>("/values"),
  saveValue: (v: Pick<ValueItem, "key" | "type" | "content">) =>
    request<void>("/values/" + key(v.key), "PUT", v),
  deleteValue: (k: string) => request<void>("/values/" + key(k), "DELETE"),
  listScripts: () => request<MockScript[]>("/scripts"),
  saveScript: (s: Pick<MockScript, "name" | "content">) =>
    request<void>("/scripts/" + key(s.name), "PUT", s),
  deleteScript: (name: string) =>
    request<void>("/scripts/" + key(name), "DELETE"),
  runScript: (name: string, req: ComposePayload) =>
    request<ScriptRunResult>(
      "/scripts/" + key(name) + "/run",
      "POST",
      composeBody(req),
    ),
  listBreakpoints: () => request<BreakpointRule[]>("/breakpoints"),
  saveBreakpoints: (list: BreakpointRule[]) =>
    request<void>("/breakpoints", "PUT", list),
  listPaused: async () => {
    const items = await request<
      (Omit<PausedItem, "headers"> & { headers: Record<string, string[]> })[]
    >("/breakpoints/paused");
    return items.map((x) => ({ ...x, headers: headerList(x.headers) }));
  },
  resolvePaused: (
    id: string,
    action: "continue" | "execute" | "abort",
    edited?: {
      method?: string;
      url?: string;
      status?: number;
      headers: Header[];
      body?: string;
    },
  ) =>
    request<void>("/breakpoints/paused/" + key(id), "POST", {
      action,
      ...edited,
      headers: edited ? headerMap(edited.headers) : undefined,
    }),
  compose: (p: ComposePayload) =>
    request<SessionDetail>("/compose", "POST", composeBody(p)),
  getThrottle: () => request<ThrottleConfig>("/throttle"),
  saveThrottle: (c: ThrottleConfig) => request<void>("/throttle", "PUT", c),
  listLanAddresses: () => request<LanAddress[]>("/lan"),
  listDevices: () => request<Device[]>("/devices"),
  setDeviceStatus: (ip: string, status: Device["status"], remember: boolean) =>
    request<void>("/devices/" + key(ip), "PUT", { status, remember }),
  renameDevice: (ip: string, name: string) =>
    request<void>("/devices/" + key(ip), "PUT", { name }),
  getAccessControl: () =>
    request<{ mode: AccessMode; whitelist: string[]; blacklist: string[] }>(
      "/access",
    ),
  saveAccessControl: (c: {
    mode: AccessMode;
    whitelist: string[];
    blacklist?: string[];
  }) => request<void>("/access", "PUT", c),
  getCA: () => request<CAInfo>("/ca"),
  installCA: () => request<void>("/ca/install", "POST", {}),
  regenerateCA: () => request<CAInfo>("/ca/regenerate", "POST", {}),
  getSslProxying: () => request<SslProxyingConfig>("/ssl-proxying"),
  saveSslProxying: (c: SslProxyingConfig) =>
    request<void>("/ssl-proxying", "PUT", c),
  listPinnedHosts: async () => {
    const hosts =
      await request<(Omit<PinnedHost, "since"> & { since: string })[]>(
        "/pinned",
      );
    return hosts.map((h) => ({ ...h, since: Date.parse(h.since) }));
  },
  clearPinnedHosts: (hosts?: string[]) =>
    request<void>(
      "/pinned" + (hosts ? "?hosts=" + key(hosts.join(",")) : ""),
      "DELETE",
    ),
  getSettings: () => request<Settings>("/settings"),
  saveSettings: (s: Partial<Settings>) => request<void>("/settings", "PUT", s),
};
export const downloadUrls = {
  caCrt: API_BASE + "/ca/charstle-ca.crt",
  caPem: API_BASE + "/ca/charstle-ca.pem",
  mobileconfig: API_BASE + "/ca/charstle.mobileconfig",
};
export function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
