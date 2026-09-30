import { useMemo, useState } from 'react';
import { ChevronRight, Folder, Globe, Lock } from 'lucide-react';
import type { SessionSummary } from '../../types';
import { useUI } from '../../store/ui';
import { MethodText, StatusText } from '../common/Badges';
import { cx, formatBytes } from '../../utils/format';

interface TreeNode {
  key: string;
  label: string;
  children: Map<string, TreeNode>;
  sessions: SessionSummary[];
  count: number;
}

function buildTree(sessions: SessionSummary[]): TreeNode[] {
  const hosts = new Map<string, TreeNode>();
  for (const s of sessions) {
    const hostKey = `${s.scheme}://${s.host}`;
    let node = hosts.get(hostKey);
    if (!node) {
      node = { key: hostKey, label: hostKey, children: new Map(), sessions: [], count: 0 };
      hosts.set(hostKey, node);
    }
    node.count++;
    const segs = s.path.split('?')[0].split('/').filter(Boolean);
    let cur = node;
    for (const seg of segs.slice(0, -1)) {
      let next = cur.children.get(seg);
      if (!next) {
        next = { key: `${cur.key}/${seg}`, label: seg, children: new Map(), sessions: [], count: 0 };
        cur.children.set(seg, next);
      }
      next.count++;
      cur = next;
    }
    cur.sessions.push(s);
  }
  return [...hosts.values()].sort((a, b) => b.count - a.count);
}

function Branch({ node, depth, isHost }: { node: TreeNode; depth: number; isHost?: boolean }) {
  const [open, setOpen] = useState(depth === 0 && node.count > 10);
  const { selectedSessionId, selectSession } = useUI();
  const isHttps = node.key.startsWith('https') || node.key.startsWith('wss');

  return (
    <>
      <div className="tree-row tree-branch" style={{ paddingLeft: 8 + depth * 16 }} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={13} className={cx('tree-caret', open && 'is-open')} />
        {isHost ? isHttps ? <Lock size={13} className="text-success" /> : <Globe size={13} className="muted" /> : <Folder size={13} className="muted" />}
        <span className={cx('ellipsis', isHost && 'tree-host')}>{node.label}</span>
        <span className="tree-count">{node.count}</span>
      </div>
      {open && (
        <>
          {[...node.children.values()].map((c) => (
            <Branch key={c.key} node={c} depth={depth + 1} />
          ))}
          {node.sessions.map((s) => (
            <div
              key={s.id}
              className={cx('tree-row tree-leaf', selectedSessionId === s.id && 'is-selected')}
              style={{ paddingLeft: 8 + (depth + 1) * 16 + 13 }}
              onClick={() => selectSession(s.id)}
            >
              <StatusText status={s.status} state={s.state} />
              <MethodText method={s.method} />
              <span className="ellipsis">{s.path.split('/').pop() || '/'}</span>
              <span className="tree-count">{formatBytes(s.resSize)}</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

/** Charles 风格的 Structure 视图：按 host → 路径分组 */
export function StructureTree({ sessions }: { sessions: SessionSummary[] }) {
  const tree = useMemo(() => buildTree(sessions), [sessions]);
  return (
    <div className="structure-tree scroll">
      {tree.map((n) => (
        <Branch key={n.key} node={n} depth={0} isHost />
      ))}
    </div>
  );
}
