import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../utils/format";

export type MenuEntry =
  | {
      type?: "item";
      label: ReactNode;
      icon?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      onClick?: () => void;
    }
  | { type: "sep" }
  | { type: "label"; label: ReactNode };

function MenuList({
  items,
  onPick,
}: {
  items: MenuEntry[];
  onPick: () => void;
}) {
  return (
    <>
      {items.map((it, i) => {
        if (it.type === "sep") return <div key={i} className="menu-sep" />;
        if (it.type === "label")
          return (
            <div key={i} className="menu-label">
              {it.label}
            </div>
          );
        return (
          <button
            key={i}
            disabled={it.disabled}
            className={cx("menu-item", it.danger && "danger")}
            onClick={() => {
              it.onClick?.();
              onPick();
            }}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.shortcut && (
              <span className="menu-shortcut">{it.shortcut}</span>
            )}
          </button>
        );
      })}
    </>
  );
}

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** 下拉菜单：trigger 为按钮内容 */
export function Dropdown({
  trigger,
  items,
  align = "left",
  buttonClass = "btn btn-ghost btn-sm",
  tip,
}: {
  trigger: ReactNode;
  items: MenuEntry[];
  align?: "left" | "right";
  buttonClass?: string;
  tip?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  return (
    <div className="menu-anchor" ref={ref}>
      <button
        className={cx(buttonClass, open && "is-active")}
        data-tip={open ? undefined : tip}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div className="menu" style={{ top: "calc(100% + 4px)", [align]: 0 }}>
          <MenuList items={items} onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/** 右键菜单：由调用方控制位置 */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuEntry[];
  onClose: () => void;
}) {
  const ref = useClickOutside(true, onClose);
  const left = Math.min(x, window.innerWidth - 240);
  const top = Math.min(y, window.innerHeight - items.length * 28 - 16);
  return (
    <div ref={ref} className="menu fixed" style={{ left, top }}>
      <MenuList items={items} onPick={onClose} />
    </div>
  );
}
