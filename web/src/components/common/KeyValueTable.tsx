import { Plus, Trash2 } from 'lucide-react';
import type { Header } from '../../types';
import { cx } from '../../utils/format';

interface Props {
  rows: Header[];
  editable?: boolean;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  className?: string;
}

/**
 * 请求头 / Query / Cookie 等键值表。
 * editable 模式下仅渲染输入框结构，数据回写由调用方实现（TODO）。
 */
export function KeyValueTable({ rows, editable, keyPlaceholder = 'Name', valuePlaceholder = 'Value', className }: Props) {
  if (!editable) {
    return (
      <table className={cx('kv-table', className)}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="kv-editable">
      <table className={cx('kv-table editable', className)}>
        <tbody>
          {[...rows, { name: '', value: '', enabled: true }].map((r, i) => (
            <tr key={i}>
              <td className="kv-check">
                <input type="checkbox" defaultChecked={r.enabled !== false} />
              </td>
              <td>
                <input className="input" defaultValue={r.name} placeholder={keyPlaceholder} />
              </td>
              <td>
                <input className="input" defaultValue={r.value} placeholder={valuePlaceholder} />
              </td>
              <td className="kv-actions">
                {i < rows.length && (
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label="删除">
                    <Trash2 size={13} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-ghost btn-sm kv-add">
        <Plus size={13} /> 添加
      </button>
    </div>
  );
}
