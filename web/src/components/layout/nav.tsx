import {
  Activity,
  Braces,
  FileCode2,
  Gauge,
  MonitorSmartphone,
  OctagonPause,
  Send,
  Settings,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  title: string;
  icon: LucideIcon;
  /** 对应设计方案中的里程碑，仅作备注 */
  milestone: string;
}

export const navGroups: NavItem[][] = [
  [{ path: '/network', label: '抓包', title: '抓包 · Network', icon: Activity, milestone: 'M1' }],
  [
    { path: '/rules', label: '规则', title: '规则 · Rules', icon: Waypoints, milestone: 'M3' },
    { path: '/values', label: 'Values', title: 'Values', icon: Braces, milestone: 'M3' },
    { path: '/scripts', label: '脚本', title: 'Mock 脚本', icon: FileCode2, milestone: 'M4' },
  ],
  [
    { path: '/breakpoints', label: '断点', title: '断点 · Breakpoints', icon: OctagonPause, milestone: 'M5' },
    { path: '/compose', label: '构造', title: '请求构造 · Compose', icon: Send, milestone: 'M4' },
    { path: '/throttle', label: '限速', title: '网络限速 · Throttle', icon: Gauge, milestone: 'M5' },
  ],
  [
    { path: '/devices', label: '设备', title: '局域网设备', icon: MonitorSmartphone, milestone: 'M1' },
    { path: '/ssl', label: '证书', title: 'HTTPS 与证书', icon: ShieldCheck, milestone: 'M2' },
  ],
];

export const settingsNav: NavItem = { path: '/settings', label: '设置', title: '设置', icon: Settings, milestone: 'M1' };
