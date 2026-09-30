import { HelpCircle, Laptop, Monitor, Smartphone, TabletSmartphone, Terminal } from 'lucide-react';
import type { Platform } from '../../types';

export function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  switch (platform) {
    case 'ios':
      return <Smartphone size={size} />;
    case 'android':
      return <TabletSmartphone size={size} />;
    case 'windows':
      return <Monitor size={size} />;
    case 'macos':
      return <Laptop size={size} />;
    case 'linux':
      return <Terminal size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
}

export const platformName: Record<Platform, string> = {
  ios: 'iOS',
  android: 'Android',
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  unknown: '未知',
};
