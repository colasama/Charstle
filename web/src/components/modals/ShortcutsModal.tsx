import { Keyboard } from "lucide-react";
import { Modal } from "../common/Modal";

const groups: { title: string; items: [string, string[]][] }[] = [
  {
    title: "全局",
    items: [
      ["开始 / 停止录制", ["Ctrl", "R"]],
      ["清空会话", ["Ctrl", "K"]],
      ["聚焦过滤框", ["Ctrl", "F"]],
      ["导出 HAR", ["Ctrl", "S"]],
      ["快捷键帮助", ["?"]],
    ],
  },
  {
    title: "会话列表",
    items: [
      ["上一个 / 下一个", ["↑", "↓"]],
      ["重放", ["R"]],
      ["编辑后发送", ["E"]],
      ["复制 URL", ["Ctrl", "C"]],
      ["删除", ["Del"]],
    ],
  },
  {
    title: "编辑器",
    items: [["保存", ["Ctrl", "S"]]],
  },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="快捷键"
      icon={<Keyboard size={18} className="muted" />}
      onClose={onClose}
    >
      <div className="col" style={{ gap: 16 }}>
        {groups.map((g) => (
          <div key={g.title}>
            <div className="section-title" style={{ marginBottom: 6 }}>
              {g.title}
            </div>
            {g.items.map(([label, keys]) => (
              <div
                key={label}
                className="row"
                style={{ height: 30, borderBottom: "1px solid var(--divider)" }}
              >
                <span className="grow text-sm">{label}</span>
                <span className="row" style={{ gap: 4 }}>
                  {keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}
