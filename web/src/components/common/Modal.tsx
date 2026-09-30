import { useEffect, useRef, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "../../utils/format";

interface Props {
  title: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  onClose: () => void;
  footer?: ReactNode;
  flush?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function Modal({
  title,
  icon,
  size = "md",
  onClose,
  footer,
  flush,
  headerExtra,
  children,
}: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((x) => x.getClientRects().length > 0);
      const first = items[0],
        last = items[items.length - 1];
      if (!first) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialog.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        className={cx("modal", size !== "md" && `modal-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          {icon}
          <div id={titleId} className="modal-title grow">
            {title}
          </div>
          {headerExtra}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className={cx("modal-body", flush && "flush")}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
