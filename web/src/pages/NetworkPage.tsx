import { MousePointerClick, Radio } from 'lucide-react';
import { useUI } from '../store/ui';
import { FilterBar } from '../components/network/FilterBar';
import { SessionTable } from '../components/network/SessionTable';
import { StructureTree } from '../components/network/StructureTree';
import { SessionDetail } from '../components/network/detail/SessionDetail';
import { SplitPane } from '../components/common/SplitPane';
import { EmptyState } from '../components/common/Controls';
import { getMockDetail, mockSessions } from '../mock/sessions';
import '../components/network/network.css';

export function NetworkPage() {
  const { networkView, detailPlacement, selectedSessionId, recording } = useUI();
  // TODO(api): 会话列表来自事件流 + /api/sessions；详情来自 /api/sessions/:id
  const sessions = mockSessions;
  const detail = selectedSessionId != null ? getMockDetail(selectedSessionId) : undefined;

  const list =
    sessions.length === 0 ? (
      <EmptyState
        icon={<Radio size={20} />}
        title={recording ? '等待流量…' : '录制已暂停'}
        desc="将浏览器或手机的 HTTP 代理指向本机地址，请求会实时出现在这里"
      />
    ) : networkView === 'list' ? (
      <SessionTable sessions={sessions} />
    ) : (
      <StructureTree sessions={sessions} />
    );

  return (
    <div className="network">
      <FilterBar />
      <SplitPane
        key={detailPlacement}
        direction={detailPlacement === 'right' ? 'horizontal' : 'vertical'}
        initial={detailPlacement === 'right' ? 560 : 360}
        min={detailPlacement === 'right' ? 360 : 180}
        first={list}
        second={detail ? <SessionDetail key={detail.id} session={detail} /> : <EmptyState icon={<MousePointerClick size={20} />} title="选择一个会话查看详情" />}
      />
    </div>
  );
}
