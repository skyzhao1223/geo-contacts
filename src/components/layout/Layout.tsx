import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Map,
  Users,
  Settings,
  UserCircle2,
  UserPlus,
  LogOut,
  Upload,
  Network,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUnreadTotal } from '@/context/ChatContext'
import { Avatar } from '@/components/ui/Avatar'

/** 底部栏 + 侧栏「核心」：控制在 4 项 */
const primaryNav = [
  {
    to: '/',
    label: '通讯录',
    icon: Users,
    match: (pathname: string) =>
      pathname === '/' ||
      pathname.startsWith('/contacts') ||
      pathname.startsWith('/import') ||
      pathname.startsWith('/family'),
  },
  {
    to: '/messages',
    label: '消息',
    icon: MessageCircle,
    match: (pathname: string) => pathname.startsWith('/messages'),
    badge: true,
  },
  {
    to: '/map',
    label: '地图',
    icon: Map,
    match: (pathname: string) => pathname.startsWith('/map'),
  },
  {
    to: '/profile',
    label: '我的',
    icon: UserCircle2,
    match: (pathname: string) =>
      pathname.startsWith('/profile') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/friends'),
  },
]

/** 侧栏工具区；移动端从「我的」进入 */
const secondaryNav = [
  { to: '/family', label: '族谱', icon: Network },
  { to: '/friends', label: '好友', icon: UserPlus },
  { to: '/import', label: '导入', icon: Upload },
  { to: '/settings', label: '设置', icon: Settings },
]

export function Layout() {
  const { user, logout } = useAuth()
  const unreadTotal = useUnreadTotal()
  const { pathname } = useLocation()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">G</div>
          <div className="brand-text">
            <div className="brand-name">GeoContacts</div>
            <div className="brand-tagline">把人脉放上地图</div>
          </div>
        </div>
        {user && (
          <div className="user-menu">
            <span className="user-menu-name">{user.displayName}</span>
            <Avatar name={user.displayName} src={user.avatar ?? undefined} size="sm" />
            <button type="button" className="icon-button" onClick={logout} title="退出登录">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      <div className="app-body">
        <nav className="side-nav" aria-label="主导航">
          <div className="nav-section-label">核心</div>
          {primaryNav.map(({ to, label, icon: Icon, match, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={() => `nav-link ${match(pathname) ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge && unreadTotal > 0 && (
                <span className="nav-unread-badge" aria-label={`${unreadTotal} 条未读消息`}>
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </NavLink>
          ))}

          <div className="nav-section-label">更多</div>
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="main-panel">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="底部导航">
        {primaryNav.map(({ to, label, icon: Icon, match, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={() => `bottom-link ${match(pathname) ? 'bottom-link-active' : ''}`}
          >
            <span className="bottom-link-icon-wrap">
              <Icon size={18} />
              {badge && unreadTotal > 0 && (
                <span
                  className="nav-unread-badge nav-unread-badge-dot"
                  aria-label={`${unreadTotal} 条未读消息`}
                >
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {unreadTotal > 0 ? `有 ${unreadTotal} 条未读消息` : '没有未读消息'}
        </span>
      </nav>
    </div>
  )
}
