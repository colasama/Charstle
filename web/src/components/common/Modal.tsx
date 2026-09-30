import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../utils/format';

interface Props {
  title: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose: () => void;
  footer?: ReactNode;
  flush?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function Modal({ title, icon, size = 'md', onClose, footer, flush, headerExtra, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', size !== 'md' && `modal-${size}`)} role="dialog" aria-modal="true">
        <div className="modal-header">
          {icon}
          <div className="modal-title grow">{title}</div>
          {headerExtra}
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>
        <div className={cx('modal-body', flush && 'flush')}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
