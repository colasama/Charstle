export type Platform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export type DeviceStatus = 'allowed' | 'blocked' | 'pending';

export interface Device {
  ip: string;
  name?: string;
  userAgent?: string;
  platform: Platform;
  status: DeviceStatus;
  firstSeen: number;
  lastSeen: number;
  requests: number;
  bytes: number;
  isLocal?: boolean;
}

export interface LanAddress {
  iface: string;
  ip: string;
  primary?: boolean;
}

export type AccessMode = 'ask' | 'whitelist' | 'allowAll';
