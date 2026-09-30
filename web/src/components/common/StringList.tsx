import { Plus, X } from 'lucide-react';

/** 可增删的字符串列表（白名单、SSL include/exclude 等）。数据回写待实现。 */
export function StringList({ items, placeholder }: { items: string[]; placeholder?: string }) {
  return (
    <div className="string-list">
      {items.map((it) => (
        <div key={it} className="string-list-row">
          <span className="grow ellipsis">{it}</span>
          <button className="btn btn-ghost btn-icon btn-sm" aria-label="移除">
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="string-list-add">
        <input className="input input-sm mono" placeholder={placeholder} />
        <button className="btn btn-sm">
          <Plus size={13} /> 添加
        </button>
      </div>
    </div>
  );
}
