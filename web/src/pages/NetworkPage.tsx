import { MousePointerClick, Radio } from "lucide-react";
import { useUI } from "../store/ui";
import { FilterBar } from "../components/network/FilterBar";
import { SessionTable } from "../components/network/SessionTable";
import { StructureTree } from "../components/network/StructureTree";
import { SessionDetail } from "../components/network/detail/SessionDetail";
import { SplitPane } from "../components/common/SplitPane";
import { EmptyState } from "../components/common/Controls";
import { useEffect, useState } from "react";
import { useData, report } from "../store/data";
import { api } from "../api/client";
import type { SessionDetail as Detail } from "../types";
import { matchesFilter } from "../utils/filter";
import "../components/network/network.css";

export function NetworkPage() {
  const { networkView, detailPlacement, selectedSessionId, recording, filter } =
    useUI();
  const { sessions: all, revision } = useData();
  const sessions = all.filter((s) => matchesFilter(s, filter));
  const [detail, setDetail] = useState<Detail>();
  useEffect(() => {
    let stale = false;
    if (selectedSessionId == null) {
      setDetail(undefined);
      return;
    }
    const timer = setTimeout(() => {
      api
        .getSession(selectedSessionId)
        .then((v) => {
          if (!stale) setDetail(v);
        })
        .catch((e) => {
          if (!stale) {
            setDetail(undefined);
            report(e);
          }
        });
    }, 100);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [selectedSessionId, revision]);

  const list =
    sessions.length === 0 ? (
      <EmptyState
        icon={<Radio size={20} />}
        title={recording ? "等待流量…" : "录制已暂停"}
        desc="将浏览器或手机的 HTTP 代理指向本机地址，请求会实时出现在这里"
      />
    ) : networkView === "list" ? (
      <SessionTable sessions={sessions} />
    ) : (
      <StructureTree sessions={sessions} />
    );

  return (
    <div className="network">
      <FilterBar />
      <SplitPane
        key={detailPlacement}
        direction={detailPlacement === "right" ? "horizontal" : "vertical"}
        initial={detailPlacement === "right" ? 560 : 360}
        min={detailPlacement === "right" ? 360 : 180}
        first={list}
        second={
          detail ? (
            <SessionDetail key={detail.id} session={detail} />
          ) : (
            <EmptyState
              icon={<MousePointerClick size={20} />}
              title="选择一个会话查看详情"
            />
          )
        }
      />
    </div>
  );
}
