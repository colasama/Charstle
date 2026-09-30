import { ArrowUpRight, Waypoints } from "lucide-react";
import { Link } from "react-router-dom";
import type { SessionDetail } from "../../../types";
import { EmptyState } from "../../common/Controls";

const phaseLabel = {
  request: "请求阶段",
  dial: "连接阶段",
  response: "响应阶段",
};

export function RuleHitsTab({ s }: { s: SessionDetail }) {
  if (!s.ruleHits.length) {
    return (
      <EmptyState
        icon={<Waypoints size={20} />}
        title="没有命中任何规则"
        desc="右键会话可以快速创建 Map Local / Map Remote / Mock 规则"
      />
    );
  }
  return (
    <div className="scroll fill rule-hits">
      {s.ruleHits.map((h, i) => (
        <div key={i} className="rule-hit">
          <div className="rule-hit-head">
            <span className="badge badge-purple">{h.action}</span>
            <span className="badge badge-outline">{phaseLabel[h.phase]}</span>
            <div className="spacer" />
            <Link
              to={`/rules?group=${encodeURIComponent(h.group)}&line=${h.line}`}
              className="text-xs row"
              style={{ gap: 2 }}
            >
              {h.group} : 第 {h.line} 行 <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="rule-hit-line mono">
            <span className="rh-pattern">{h.pattern}</span>
            <span className="rh-action">
              {h.action}://
              <span className="rh-value">{h.value}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
