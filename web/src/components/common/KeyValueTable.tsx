import { Plus, Trash2 } from "lucide-react";
import type { Header } from "../../types";
import { cx } from "../../utils/format";
interface Props {
  rows: Header[];
  editable?: boolean;
  onChange?: (rows: Header[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  className?: string;
}
export function KeyValueTable({
  rows,
  editable,
  onChange,
  keyPlaceholder = "Name",
  valuePlaceholder = "Value",
  className,
}: Props) {
  const update = (i: number, patch: Partial<Header>) =>
    onChange?.(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  return (
    <div className={editable ? "kv-editable" : undefined}>
      <table className={cx("kv-table", editable && "editable", className)}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {editable ? (
                <>
                  <td className="kv-check">
                    <input
                      aria-label="启用此行"
                      type="checkbox"
                      checked={r.enabled !== false}
                      onChange={(e) => update(i, { enabled: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      aria-label={keyPlaceholder}
                      value={r.name}
                      placeholder={keyPlaceholder}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      aria-label={valuePlaceholder}
                      value={r.value}
                      placeholder={valuePlaceholder}
                      onChange={(e) => update(i, { value: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-icon"
                      aria-label="删除"
                      onClick={() => onChange?.(rows.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td>{r.name}</td>
                  <td>{r.value}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() =>
            onChange?.([...rows, { name: "", value: "", enabled: true }])
          }
        >
          <Plus size={13} />
          添加
        </button>
      )}
    </div>
  );
}
