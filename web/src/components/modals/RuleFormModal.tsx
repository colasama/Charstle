import { Plus, Trash2, Waypoints } from 'lucide-react';
import { Modal } from '../common/Modal';
import { actionDocs, mockRuleGroups } from '../../mock/data';

/** 表单方式添加规则，保存时生成一行文本追加到规则组 */
export function RuleFormModal({ groupId, onClose }: { groupId?: string; onClose: () => void }) {
  // TODO: 表单 → 规则文本；实时预览
  return (
    <Modal
      size="lg"
      title="添加规则"
      icon={<Waypoints size={18} className="muted" />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            添加
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        <div className="grid-2" style={{ gridTemplateColumns: '160px 1fr' }}>
          <div className="field">
            <label>匹配方式</label>
            <select className="select">
              <option>域名 / 前缀</option>
              <option>通配符</option>
              <option>正则</option>
            </select>
          </div>
          <div className="field">
            <label>Pattern</label>
            <input className="input mono" placeholder="api.example.com/v1/user" />
          </div>
        </div>

        <div className="field">
          <label>动作</label>
          {[{ kind: 'mock', value: '{userInfo}' }, { kind: 'delay', value: '500' }].map((a, i) => (
            <div key={i} className="row">
              <select className="select mono" style={{ width: 160 }} defaultValue={a.kind}>
                {actionDocs.map((d) => (
                  <option key={d.kind} value={d.kind}>
                    {d.kind}
                  </option>
                ))}
              </select>
              <input className="input mono" defaultValue={a.value} />
              <button className="btn btn-ghost btn-icon" aria-label="删除">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div>
            <button className="btn btn-sm btn-ghost">
              <Plus size={13} /> 添加动作
            </button>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>仅限方法</label>
            <select className="select">
              <option>全部</option>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
          <div className="field">
            <label>仅限客户端 IP</label>
            <input className="input mono" placeholder="全部设备" />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>添加到规则组</label>
            <select className="select" defaultValue={groupId}>
              {mockRuleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>位置</label>
            <select className="select">
              <option>末尾</option>
              <option>开头（最高优先级）</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>预览</label>
          <div className="syntax-card">
            <span className="p">api.example.com/v1/user</span> <span className="k">mock://</span>
            <span className="r">{'{userInfo}'}</span> <span className="k">delay://</span>500
          </div>
        </div>
      </div>
    </Modal>
  );
}
