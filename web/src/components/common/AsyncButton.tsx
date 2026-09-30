import { useRef, useState, type ButtonHTMLAttributes } from "react";
import { perform } from "../../store/data";
export function AsyncButton({
  run,
  message,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  run: () => Promise<unknown>;
  message?: string;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        try {
          await perform(run, message);
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    >
      {busy ? "处理中…" : children}
    </button>
  );
}
