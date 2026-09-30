import { TriangleAlert } from 'lucide-react';
import { useUI } from '../../store/ui';
import { Modal } from '../common/Modal';
import { DeviceApprovalModal } from './DeviceApprovalModal';
import { BreakpointEditorModal } from './BreakpointEditorModal';
import { HarImportModal } from './HarImportModal';
import { ShortcutsModal } from './ShortcutsModal';
import { RuleFormModal } from './RuleFormModal';
import { ConnectGuideModal } from './ConnectGuideModal';

/** 全局弹窗出口，由 useUI().openModal 驱动 */
export function ModalHost() {
  const { modal, closeModal } = useUI();
  if (!modal) return null;

  switch (modal.type) {
    case 'deviceApproval':
      return <DeviceApprovalModal ip={modal.ip} onClose={closeModal} />;
    case 'breakpoint':
      return <BreakpointEditorModal id={modal.id} onClose={closeModal} />;
    case 'harImport':
      return <HarImportModal onClose={closeModal} />;
    case 'shortcuts':
      return <ShortcutsModal onClose={closeModal} />;
    case 'ruleForm':
      return <RuleFormModal groupId={modal.groupId} onClose={closeModal} />;
    case 'connectGuide':
      return <ConnectGuideModal onClose={closeModal} />;
    case 'confirm':
      return (
        <Modal
          size="sm"
          title={modal.title}
          icon={modal.danger ? <TriangleAlert size={18} className="text-danger" /> : undefined}
          onClose={closeModal}
          footer={
            <>
              <button className="btn" onClick={closeModal}>
                取消
              </button>
              <button className={modal.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={closeModal}>
                确定
              </button>
            </>
          }
        >
          <p className="text-sm">{modal.message}</p>
        </Modal>
      );
  }
}
