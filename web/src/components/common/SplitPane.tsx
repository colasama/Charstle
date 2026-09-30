import { useCallback, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../utils/format';

interface Props {
  direction: 'horizontal' | 'vertical';
  /** 第二个面板的初始尺寸（px） */
  initial?: number;
  min?: number;
  max?: number;
  first: ReactNode;
  second?: ReactNode;
  className?: string;
}

/** 可拖拽分栏。second 为空时 first 占满。 */
export function SplitPane({ direction, initial = 480, min = 240, max = 1200, first, second, className }: Props) {
  const [size, setSize] = useState(initial);
  const root = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const horizontal = direction === 'horizontal';

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      const rect = root.current!.getBoundingClientRect();
      const onMove = (ev: MouseEvent) => {
        const v = horizontal ? rect.right - ev.clientX : rect.bottom - ev.clientY;
        const limit = (horizontal ? rect.width : rect.height) - 160;
        setSize(Math.max(min, Math.min(max, limit, v)));
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [horizontal, min, max],
  );

  return (
    <div ref={root} className={cx('split', horizontal ? 'split-h' : 'split-v', dragging && 'is-dragging', className)}>
      <div className="split-pane split-first">{first}</div>
      {second && (
        <>
          <div className="split-handle" onMouseDown={onDown} role="separator" aria-orientation={horizontal ? 'vertical' : 'horizontal'} />
          <div className="split-pane split-second" style={horizontal ? { width: size } : { height: size }}>
            {second}
          </div>
        </>
      )}
    </div>
  );
}
