import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { navGroups, settingsNav, type NavItem } from './nav';
import { cx } from '../../utils/format';

// TODO(api): 角标数据来自事件流（待处理断点数、待授权设备数）
const badges: Record<string, { count: number; tone?: 'warning' }> = {
  '/breakpoints': { count: 2, tone: 'warning' },
  '/devices': { count: 1 },
};

function Item({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const badge = badges[item.path];
  return (
    <NavLink to={item.path} className={({ isActive }) => cx('nav-item', isActive && 'active')} data-tip={item.title} data-tip-pos="right">
      <Icon size={18} strokeWidth={1.8} />
      <span>{item.label}</span>
      {badge && <span className={cx('nav-badge', badge.tone && `tone-${badge.tone}`)}>{badge.count}</span>}
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
