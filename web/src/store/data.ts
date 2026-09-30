import { create } from "zustand";
import { api, headerList, type ThrottleConfig } from "../api/client";
import type {
  RuleGroup,
  ValueItem,
  MockScript,
  SessionSummary,
  Device,
  LanAddress,
  Settings,
  CAInfo,
  SslProxyingConfig,
  PinnedHost,
  BreakpointRule,
  PausedItem,
  AccessMode,
} from "../types";
import { useUI } from "./ui";
interface Data {
  proxyPort: number;
  sessions: SessionSummary[];
  groups: RuleGroup[];
  values: ValueItem[];
  scripts: MockScript[];
  devices: Device[];
  lan: LanAddress[];
  settings: Settings | null;
  ca: CAInfo | null;
  ssl: SslProxyingConfig;
  throttle: ThrottleConfig;
  access: { mode: AccessMode; whitelist: string[]; blacklist: string[] };
  pinned: PinnedHost[];
  breakpoints: BreakpointRule[];
  paused: PausedItem[];
  connected: boolean;
  loaded: boolean;
  error: string;
  notice: string;
  revision: number;
}
export const useData = create<Data>(() => ({
  proxyPort: 8888,
  sessions: [],
  groups: [],
  values: [],
  scripts: [],
  devices: [],
  lan: [],
  settings: null,
  ca: null,
  ssl: { enabled: true, include: [], exclude: [] },
  throttle: {
    enabled: false,
    profile: {
      id: "custom",
      name: "Custom",
      down: 0,
      up: 0,
      latency: 0,
      loss: 0,
    },
    hosts: [],
  },
  access: { mode: "ask", whitelist: [], blacklist: [] },
  pinned: [],
  breakpoints: [],
  paused: [],
  connected: false,
  loaded: false,
  error: "",
  notice: "",
  revision: 0,
}));
let refreshing: Promise<void> | null = null;
export function refresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const [
        sessions,
        groups,
        values,
        scripts,
        devices,
        lan,
        settings,
        ca,
        ssl,
        throttle,
        access,
        pinned,
        breakpoints,
        paused,
        state,
      ] = await Promise.all([
        api.listSessions({ limit: 10000 }),
        api.listRuleGroups(),
        api.listValues(),
        api.listScripts(),
        api.listDevices(),
        api.listLanAddresses(),
        api.getSettings(),
        api.getCA(),
        api.getSslProxying(),
        api.getThrottle(),
        api.getAccessControl(),
        api.listPinnedHosts(),
        api.listBreakpoints(),
        api.listPaused(),
        api.state(),
      ]);
      useData.setState((s) => ({
        proxyPort: state.proxyPort,
        sessions,
        groups,
        values,
        scripts,
        devices,
        lan,
        settings,
        ca,
        ssl,
        throttle,
        access,
        pinned,
        breakpoints,
        paused,
        loaded: true,
        revision: s.revision + 1,
      }));
      useUI.setState(state);
    } catch (e) {
      report(e);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
export function report(e: unknown) {
  useData.setState({ error: e instanceof Error ? e.message : String(e) });
}
let noticeTimer: ReturnType<typeof setTimeout>;
export function notify(notice: string) {
  clearTimeout(noticeTimer);
  useData.setState({ notice, error: "" });
  noticeTimer = setTimeout(() => useData.setState({ notice: "" }), 3500);
}
export async function perform<T>(
  work: () => Promise<T>,
  message?: string,
): Promise<T | undefined> {
  try {
    const result = await work();
    await refresh();
    if (message) notify(message);
    return result;
  } catch (e) {
    report(e);
    return undefined;
  }
}
let eventTimer: ReturnType<typeof setTimeout> | undefined;
export function onEvent(e: { type: string; payload?: unknown }) {
  if (e.type === "session.add" || e.type === "session.update") {
    const item = e.payload as SessionSummary;
    useData.setState((s) => ({
      sessions: [item, ...s.sessions.filter((v) => v.id !== item.id)]
        .sort((a, b) => b.id - a.id)
        .slice(0, s.settings?.maxSessions ?? 10000),
      revision: s.revision + 1,
    }));
    return;
  }
  if (e.type === "session.remove") {
    useData.setState((s) => ({
      sessions: s.sessions.filter((v) => v.id !== e.payload),
    }));
    return;
  }
  if (e.type === "session.clear") {
    useData.setState({ sessions: [] });
    useUI.setState({ selectedSessionId: null });
    return;
  }
  if (e.type === "device.pending" || e.type === "device.update") {
    const d = e.payload as Device;
    useData.setState((s) => ({
      devices: [...s.devices.filter((x) => x.ip !== d.ip), d],
    }));
    return;
  }
  if (e.type === "breakpoint.paused") {
    const p = e.payload as Omit<PausedItem, "headers"> & {
      headers: Record<string, string[]>;
    };
    useData.setState((s) => ({
      paused: [
        ...s.paused.filter((x) => x.id !== p.id),
        { ...p, headers: headerList(p.headers) },
      ],
    }));
    return;
  }
  if (e.type === "breakpoint.resolved") {
    useData.setState((s) => ({
      paused: s.paused.filter((x) => x.id !== e.payload),
    }));
    return;
  }
  if (eventTimer) return;
  eventTimer = setTimeout(() => {
    eventTimer = undefined;
    void refresh();
  }, 150);
}
export async function toggleGlobal(
  key:
    "recording" | "sslProxying" | "breakpoints" | "throttling" | "systemProxy",
) {
  const on = !useUI.getState()[key];
  const d = useData.getState();
  await perform(async () => {
    switch (key) {
      case "recording":
        await api.setRecording(on);
        break;
      case "sslProxying":
        await api.saveSslProxying({ ...d.ssl, enabled: on });
        break;
      case "breakpoints":
        await api.setBreakpointsEnabled(on);
        break;
      case "throttling":
        await api.saveThrottle({ ...d.throttle, enabled: on });
        break;
      case "systemProxy":
        await api.setSystemProxy(on);
    }
  });
}
