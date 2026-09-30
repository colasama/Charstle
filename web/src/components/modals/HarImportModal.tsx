import { useState } from "react";
import { Modal } from "../common/Modal";
import { AsyncButton } from "../common/AsyncButton";
import { api } from "../../api/client";
export function HarImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Modal
      title="导入 HAR"
      onClose={onClose}
      footer={
        <AsyncButton
          className="btn btn-primary"
          disabled={!file}
          run={async () => {
            if (file) {
              await api.importHar(file);
              onClose();
            }
          }}
          message="HAR 已导入"
        >
          导入
        </AsyncButton>
      }
    >
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFile(e.dataTransfer.files[0] ?? null);
        }}
      >
        <p>{file?.name ?? "拖拽 .har 文件到这里"}</p>
        <input
          type="file"
          aria-label="选择 HAR 文件"
          accept=".har,.json,application/json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <p className="muted">导入的会话将追加到当前列表。</p>
    </Modal>
  );
}
