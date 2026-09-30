import { useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import type { WsFrame } from '../../../types';
import { Segmented } from '../../common/Controls';
import { SplitPane } from '../../common/SplitPane';
import { CodeView } from '../../common/CodeView';
import { EmptyState } from '../../common/Controls';
import { cx, formatBytes, formatTime } from '../../../utils/format';

export function FramesTab({ frames }: { frames: WsFrame[] }) {
  const [dir, setDir] = useState<'all' | 'out' | 'in'>('all');
  const [selected, setSelected] = useState<number | null>(frames[1]?.id ?? null);
  // TODO: 关键字过滤
  const list = frames.filter((f) => dir === 'all' || f.dir === dir);
  const current = frames.find((f) => f.id === selected);

  let pretty = current?.data ?? '';
  try {
    pretty = JSON.stringify(JSON.parse(pretty), null, 2);
  } catch {
    /* 非 JSON，原样展示 */
  }

  return (
    <div className="frames">
      <div className="frames-toolbar">
        <Segmented
          value={dir}
          onChange={setDir}
          options={[
            { value: 'all', label: '全部' },
            { value: 'out', label: '发送', icon: <ArrowUp size={12} /> },
            { value: 'in', label: '接收', icon: <ArrowDown size={12} /> },
          ]}
        />
        <div className="input-group grow">
          <Search size={13} />
          <input className="input input-sm" placeholder="过滤消息内容" />
        </div>
      </div>
      <SplitPane
        direction="vertical"
        initial={200}
        min={100}
        first={
          <div className="scroll fill">
            {list.map((f) => (
              <div key={f.id} className={cx('frame-row', `frame-${f.dir}`, f.id === selected && 'is-selected')} onClick={() => setSelected(f.id)}>
                <span className="frame-dir">{f.dir === 'out' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>
                <span className="ellipsis mono frame-data">{f.opcode === 'text' ? f.data : `[${f.opcode}]`}</span>
                <span className="muted text-xs">{formatBytes(f.size)}</span>
                <span className="faint text-xs mono">{formatTime(f.time)}</span>
              </div>
            ))}
          </div>
        }
        second={current ? <CodeView value={pretty} lang="json" readOnly /> : <EmptyState title="选择一条消息查看内容" />}
      />
    </div>
  );
}
