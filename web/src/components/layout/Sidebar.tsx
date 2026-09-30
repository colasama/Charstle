import { Fragment } from "react";
import { NavLink } from "react-router-dom";
import { navGroups, settingsNav, type NavItem } from "./nav";
import { cx } from "../../utils/format";

import { useData } from "../../store/data";

function Item({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const { devices, paused } = useData();
  const count =
    item.path === "/breakpoints"
      ? paused.length
      : item.path === "/devices"
        ? devices.filter((d) => d.status === "pending").length
        : 0;
  const badge = count ? { count, tone: "warning" } : undefined;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => cx("nav-item", isActive && "active")}
      data-tip={item.title}
      data-tip-pos="right"
    >
      <Icon size={18} strokeWidth={1.8} />
      <span>{item.label}</span>
      {badge && (
        <span className={cx("nav-badge", badge.tone && `tone-${badge.tone}`)}>
          {badge.count}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <nav className="sidebar">
      {navGroups.map((group, i) => (
        <Fragment key={i}>
          {i > 0 && <div className="sidebar-sep" />}
          <div className="sidebar-group">
            {group.map((it) => (
              <Item key={it.path} item={it} />
            ))}
          </div>
        </Fragment>
      ))}
      <div className="spacer" />
      <Item item={settingsNav} />
    </nav>
  );
}
