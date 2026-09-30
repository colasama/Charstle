import type { ReactNode } from 'react';
import { cx } from '../../utils/format';

/* ---------------- Switch ---------------- */

interface SwitchProps {
  on: boolean;
  onChange?: (on: boolean) => void;
  size?: 'md' | 'sm';
  label?: string;
  disabled?: boolean;
}

export function Switch({ on, onChange, size = 'md', label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={cx('switch', on && 'is-on', size === 'sm' && 'switch-sm')}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!on);
      }}
    />
  );
}

/* ---------------- Segmented ---------------- */

interface SegmentedProps<V extends string> {
  value: V;
  options: { value: V; label: ReactNode; icon?: ReactNode; tip?: string }[];
  onChange: (v: V) => void;
}

export function Segmented<V extends string>({ value, options, onChange }: SegmentedProps<V>) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} data-tip={o.tip} className={cx(o.value === value && 'is-active')} onClick={() => onChange(o.value)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Empty ---------------- */

interface EmptyProps {
  icon?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, desc, action }: EmptyProps) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ---------------- Field row（设置类表单） ---------------- */

interface FieldRowProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

export function FieldRow({ label, hint, children }: FieldRowProps) {
  return (
    <div className="field-row">
      <div className="field-meta">
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      <div className="field-control">{children}</div>
    </div>
  );
}

/* ---------------- Page header ---------------- */

interface PageHeaderProps {
  icon?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, desc, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      {icon && <div className="page-header-icon">{icon}</div>}
      <div className="grow">
        <h1 className="page-title">{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}
