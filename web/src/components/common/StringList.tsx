import { useState } from "react";
import { Plus, X } from "lucide-react";
export function StringList({
  items,
  placeholder,
  onChange,
}: {
  items: string[];
  placeholder?: string;
  onChange?: (items: string[]) => void;
}) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim();
    if (v && !items.includes(v)) {
      onChange?.([...items, v]);
      setValue("");
    }
  };
  return (
    <div className="string-list">
      {items.map((it, i) => (
        <div key={it} className="string-list-row">
          <span className="grow ellipsis">{it}</span>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            aria-label="移除"
            onClick={() => onChange?.(items.filter((_, j) => j !== i))}
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="string-list-add">
        <input
          className="input input-sm mono"
          value={value}
          placeholder={placeholder}
          aria-label={placeholder ?? "新项目"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn btn-sm" onClick={add}>
          <Plus size={13} />
          添加
        </button>
      </div>
    </div>
  );
}
