/**
 * 纯界面状态（主题、选中项、面板布局、弹窗、全局开关的显示状态）。
 * 业务数据（会话、规则…）接入后端后另建 store，不要塞进这里。
 */
import { create } from 'zustand';
import type { ResourceType } from '../types';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ModalState =
  | { type: 'deviceApproval'; ip: string }
  | { type: 'breakpoint'; id: string }
  | { type: 'harImport' }
  | { type: 'shortcuts' }
  | { type: 'ruleForm'; groupId?: string }
  | { type: 'connectGuide' }
  | { type: 'confirm'; title: string; message: string; danger?: boolean };

export interface NetworkFilter {
  keyword: string;
  types: ResourceType[];
  status: 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'error';
  clientIp: string; // '' = 全部设备
  onlyMatched: boolean;
  hideTunnels: boolean;
}

interface UIState {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;

  // 全局开关（显示状态；实际开关由后端完成）
  recording: boolean;
  sslProxying: boolean;
  breakpoints: boolean;
  throttling: boolean;
  systemProxy: boolean;
  toggle: (key: 'recording' | 'sslProxying' | 'breakpoints' | 'throttling' | 'systemProxy') => void;

  // Network 页
  selectedSessionId: number | null;
  selectSession: (id: number | null) => void;
  networkView: 'list' | 'structure';
  setNetworkView: (v: 'list' | 'structure') => void;
  detailPlacement: 'right' | 'bottom';
  setDetailPlacement: (v: 'right' | 'bottom') => void;
  filter: NetworkFilter;
  setFilter: (patch: Partial<NetworkFilter>) => void;

  // 弹窗
  modal: ModalState | null;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
}

const readTheme = (): ThemeMode => {
  try {
    return (localStorage.getItem('charstle.theme') as ThemeMode) || 'system';
  } catch {
    return 'system';
  }
};

export const useUI = create<UIState>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('charstle.theme', theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },

  recording: true,
  sslProxying: true,
  breakpoints: true,
  throttling: false,
  systemProxy: false,
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<UIState>),

  selectedSessionId: 4,
  selectSession: (selectedSessionId) => set({ selectedSessionId }),
  networkView: 'list',
  setNetworkView: (networkView) => set({ networkView }),
  detailPlacement: 'right',
  setDetailPlacement: (detailPlacement) => set({ detailPlacement }),
  filter: { keyword: '', types: [], status: 'all', clientIp: '', onlyMatched: false, hideTunnels: false },
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),

  modal: null,
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
}));
