import { useState } from 'react';
import { FileUp, UploadCloud } from 'lucide-react';
import { Modal } from '../common/Modal';
import { cx } from '../../utils/format';

export function HarImportModal({ onClose }: { onClose: () => void }) {
  const [over, setOver] = useState(false);
  // TODO(api): api.importHar(file)
  return (
    <Modal
      title="导入 HAR"
      icon={<FileUp size={18} className="muted" />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" disabled>
            导入
          </button>
        </>
      }
    >
      <div
        className={cx('dropzone', over && 'is-over')}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
        }}
      >
        <UploadCloud size={28} />
        <div style={{ fontWeight: 600 }}>拖拽 .har 文件到这里</div>
        <div className="text-sm">或</div>
        <label className="btn btn-sm">
          选择文件
          <input type="file" accept=".har,application/json" hidden />
        </label>
      </div>
      <div className="col" style={{ marginTop: 16, gap: 8 }}>
        <label className="check-label">
          <input type="radio" name="har-mode" defaultChecked /> 追加到当前会话列表
        </label>
        <label className="check-label">
          <input type="radio" name="har-mode" /> 清空当前会话后导入
        </label>
      </div>
    </Modal>
  );
}
