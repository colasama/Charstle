import type { ReactNode } from 'react';
import { cx } from '../../utils/format';

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  hidden?: boolean;
}

interface Props<K extends string> {
  items: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  size?: 'md' | 'sm';
  extra?: ReactNode;
  className?: string;
}

export function Tabs<K extends string>({ items, active, onChange, size = 'md', extra, className }: Props<K>) {
  return (
    <div className={cx('tabs', size === 'sm' && 'tabs-sm', className)} role="tablist">
      {items
        .filter((t) => !t.hidden)
        .map((t) => (
          <button key={t.key} role="tab" aria-selected={t.key === active} className={cx('tab', t.key === active && 'is-active')} onClick={() => onChange(t.key)}>
            {t.icon}
            {t.label}
            {t.badge != null && <span className="badge">{t.badge}</span>}
          </button>
        ))}
      {extra && <div className="tabs-extra">{extra}</div>}
    </div>
  );
}
