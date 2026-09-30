import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from '../../utils/format';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function Primitive({ v }: { v: Json }) {
  if (v === null) return <span className="jt-null">null</span>;
  if (typeof v === 'boolean') return <span className="jt-bool">{String(v)}</span>;
  if (typeof v === 'number') return <span className="jt-num">{v}</span>;
  return <span className="jt-str">"{String(v)}"</span>;
}

function Node({ name, value, depth }: { name?: string; value: Json; depth: number }) {
  const isObj = value !== null && typeof value === 'object';
  const [open, setOpen] = useState(depth < 2);

  if (!isObj) {
    return (
      <div className="jt-row" style={{ paddingLeft: depth * 14 + 16 }}>
        {name != null && <span className="jt-key">{name}: </span>}
        <Primitive v={value} />
      </div>
    );
  }

  const entries: [string, Json][] = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  const [l, r] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];

  return (
    <>
      <div className="jt-row jt-branch" style={{ paddingLeft: depth * 14 }} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={12} className={cx('jt-caret', open && 'is-open')} />
        {name != null && <span className="jt-key">{name}: </span>}
        <span className="jt-punct">{l}</span>
        {!open && (
          <>
            <span className="jt-summary">{Array.isArray(value) ? `${entries.length} items` : `${entries.length} keys`}</span>
            <span className="jt-punct">{r}</span>
          </>
        )}
      </div>
      {open && (
        <>
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} />
          ))}
          <div className="jt-row" style={{ paddingLeft: depth * 14 + 16 }}>
            <span className="jt-punct">{r}</span>
          </div>
        </>
      )}
    </>
  );
}

export function JsonTree({ text }: { text: string }) {
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch {
    return <pre className="jt-error">JSON 解析失败</pre>;
  }
  return (
    <div className="json-tree">
      <Node value={data} depth={0} />
    </div>
  );
}
