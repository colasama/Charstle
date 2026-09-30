import { useState } from "react";
import { Modal } from "../common/Modal";
import { AsyncButton } from "../common/AsyncButton";
import { api } from "../../api/client";
import { useData } from "../../store/data";
import { actionDocs } from "../../data/reference";
export function RuleFormModal({
  groupId,
  onClose,
}: {
  groupId?: string;
  onClose: () => void;
}) {
  const groups = useData((s) => s.groups);
  const [id, setID] = useState(groupId ?? groups[0]?.id ?? ""),
    [pattern, setPattern] = useState(""),
    [kind, setKind] = useState("mock"),
    [value, setValue] = useState(""),
    [method, setMethod] = useState("*"),
    [ip, setIP] = useState("");
  const line = [
    pattern,
    kind + "://" + value,
    method === "*" ? "" : "method=" + method,
    ip ? "clientIp=" + ip : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Modal
      title="添加规则"
      onClose={onClose}
      footer={
        <AsyncButton
          className="btn btn-primary"
          disabled={!id || !pattern}
          run={async () => {
            const latest = (await api.listRuleGroups()).find(
              (g) => g.id === id,
            );
            if (!latest) throw Error("规则组不存在");
            await api.saveRuleGroup({
              ...latest,
              content: latest.content + "\n" + line + "\n",
            });
            onClose();
          }}
          message="规则已添加"
        >
          添加
        </AsyncButton>
      }
    >
      <div className="col">
        <label>
          规则组
          <select
            className="select"
            value={id}
            onChange={(e) => setID(e.target.value)}
          >
            {groups.map((g) => (
              <option value={g.id} key={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          匹配
          <input
            className="input mono"
            placeholder="example.com/api/"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
        </label>
        <label>
          动作
          <select
            className="select"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {actionDocs.map((a) => (
              <option key={a.kind}>{a.kind}</option>
            ))}
          </select>
        </label>
        <label>
          值
          <input
            className="input mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <label>
          方法
          <select
            className="select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {["*", "GET", "POST", "PUT", "DELETE", "OPTIONS"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          客户端 IP
          <input
            className="input mono"
            value={ip}
            onChange={(e) => setIP(e.target.value)}
          />
        </label>
        <code>{line}</code>
      </div>
    </Modal>
  );
}
