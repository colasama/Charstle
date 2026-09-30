import {
  ListTree,
  List,
  PanelBottom,
  PanelRight,
  Search,
  X,
  Filter,
} from "lucide-react";
import { useUI } from "../../store/ui";
import type { ResourceType } from "../../types";
import { Segmented } from "../common/Controls";
import { Dropdown } from "../common/Menu";
import { cx } from "../../utils/format";
import { useData } from "../../store/data";

const TYPES: { key: ResourceType | "all"; label: string; count: number }[] = [
  { key: "all", label: "全部", count: 120 },
  { key: "xhr", label: "XHR", count: 64 },
  { key: "doc", label: "Doc", count: 4 },
  { key: "js", label: "JS", count: 12 },
  { key: "css", label: "CSS", count: 4 },
  { key: "img", label: "Img", count: 16 },
  { key: "media", label: "Media", count: 4 },
  { key: "font", label: "Font", count: 4 },
  { key: "ws", label: "WS", count: 4 },
  { key: "other", label: "其他", count: 8 },
];

export function FilterBar() {
  const {
    filter,
    setFilter,
    networkView,
    setNetworkView,
    detailPlacement,
    setDetailPlacement,
  } = useUI();
  const { devices, sessions } = useData();

  const toggleType = (k: ResourceType | "all") => {
    if (k === "all") return setFilter({ types: [] });
    const has = filter.types.includes(k);
    setFilter({
      types: has ? filter.types.filter((t) => t !== k) : [...filter.types, k],
    });
  };

  const device = devices.find((d) => d.ip === filter.clientIp);

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="input-group filter-search">
          <Search size={14} />
          <input
            id="network-filter"
            className="input"
            placeholder="过滤 URL…   支持 host:api.example.com  method:POST  status:5xx  /正则/"
            value={filter.keyword}
            onChange={(e) => setFilter({ keyword: e.target.value })}
          />
          {filter.keyword && (
            <div className="input-suffix">
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setFilter({ keyword: "" })}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        <Dropdown
          buttonClass={cx("btn btn-sm", filter.clientIp && "is-active")}
          trigger={
            <>
              <Filter size={13} />
              {device ? (device.name ?? device.ip) : "全部设备"}
            </>
          }
          items={[
            { label: "全部设备", onClick: () => setFilter({ clientIp: "" }) },
            { type: "sep" },
            ...devices
              .filter((d) => d.status === "allowed")
              .map((d) => ({
                label: `${d.name ?? "未命名"} · ${d.ip}`,
                onClick: () => setFilter({ clientIp: d.ip }),
              })),
          ]}
        />

        <Segmented
          value={filter.status}
          onChange={(status) => setFilter({ status })}
          options={[
            { value: "all", label: "全部" },
            { value: "2xx", label: "2xx" },
            { value: "3xx", label: "3xx" },
            { value: "4xx", label: "4xx" },
            { value: "5xx", label: "5xx" },
            { value: "error", label: "失败" },
          ]}
        />

        <div className="spacer" />

        <Segmented
          value={networkView}
          onChange={setNetworkView}
          options={[
            {
              value: "list",
              label: "",
              icon: <List size={14} />,
              tip: "列表视图",
            },
            {
              value: "structure",
              label: "",
              icon: <ListTree size={14} />,
              tip: "按域名分组",
            },
          ]}
        />
        <Segmented
          value={detailPlacement}
          onChange={setDetailPlacement}
          options={[
            {
              value: "right",
              label: "",
              icon: <PanelRight size={14} />,
              tip: "详情在右侧",
            },
            {
              value: "bottom",
              label: "",
              icon: <PanelBottom size={14} />,
              tip: "详情在底部",
            },
          ]}
        />
      </div>

      <div className="filter-row">
        <div className="type-chips">
          {TYPES.map((t) => {
            const active =
              t.key === "all"
                ? filter.types.length === 0
                : filter.types.includes(t.key);
            return (
              <button
                key={t.key}
                className={cx("chip", active && "is-active")}
                onClick={() => toggleType(t.key)}
              >
                {t.label}
                <span className="chip-count">
                  {t.key === "all"
                    ? sessions.length
                    : sessions.filter((s) => s.type === t.key).length}
                </span>
              </button>
            );
          })}
        </div>
        <div className="spacer" />
        <label className="check-label">
          <input
            type="checkbox"
            checked={filter.onlyMatched}
            onChange={(e) => setFilter({ onlyMatched: e.target.checked })}
          />
          仅命中规则
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={filter.hideTunnels}
            onChange={(e) => setFilter({ hideTunnels: e.target.checked })}
          />
          隐藏隧道
        </label>
      </div>
    </div>
  );
}
