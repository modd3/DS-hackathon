import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, List, AlertOctagon,
  ShieldCheck, ChevronDown, Eye, Server, TrendingUp,
  Bell, X, ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRole, ROLES } from '../../context/RoleContext.jsx'
import { useServerHealth, useNotifications } from '../../hooks/useApi.js'
import { apiFetch } from '../../config/config.js'

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',     icon: LayoutDashboard, permission: null                 },
  { to: '/journeys',  label: 'Journeys',      icon: List,            permission: 'journey.read'       },
  { to: '/incidents', label: 'SLA Incidents', icon: AlertOctagon,    permission: 'sla.read'           },
  { to: '/analytics', label: 'Analytics',     icon: TrendingUp,      permission: 'sla.read'           },
  { to: '/system',    label: 'System Health', icon: Server,          permission: 'system.read'        },
  { to: '/admin',     label: 'Admin',         icon: ShieldCheck,     permission: 'admin.users.manage' },
]

function RoleSwitcher() {
  const { role, setRole, roleInfo } = useRole()
  return (
    <div className="relative">
      <label className="block text-[10px] uppercase tracking-wider text-slate-600 mb-1 font-medium">Active Role</label>
      <div className="relative">
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full appearance-none bg-surface-800 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500 transition-colors pr-7 cursor-pointer"
        >
          {Object.entries(ROLES).map(([key, r]) => (
            <option key={key} value={key}>{r.label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
      <div className={clsx('mt-1 text-[10px] font-medium', roleInfo.color)}>
        {roleInfo.permissions.length} permissions active
      </div>
    </div>
  )
}

function ServerStatus() {
  const { data, error } = useServerHealth()
  const ok = data?.ok && !error
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', ok ? 'bg-emerald-500 animate-pulse-slow' : 'bg-red-500')} />
      <span className={ok ? 'text-emerald-400' : 'text-red-400'}>{ok ? 'Server connected' : 'Server unreachable'}</span>
    </div>
  )
}

function NotificationBell() {
  const { data, mutate } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const unread = data?.unreadCount ?? 0
  const notifications = data?.notifications ?? []

  async function markAllRead() {
    await apiFetch('/api/internal/notifications/mark-read', { method: 'POST', auth: true, body: JSON.stringify({}) })
    mutate()
  }

  async function markRead(id) {
    await apiFetch('/api/internal/notifications/mark-read', { method: 'POST', auth: true, body: JSON.stringify({ ids: [id] }) })
    mutate()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
          open ? 'bg-surface-600 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-surface-700'
        )}
      >
        <Bell size={15} className={clsx(open ? 'text-amber-400' : unread > 0 ? 'text-amber-400' : '')} />
        <span className="flex-1 text-left">Notifications</span>
        {unread > 0 && (
          <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* panel — fixed position, left-aligned to sidebar, never clips viewport */}
          <div
            className="fixed z-50 bg-surface-700 border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ left: '224px', bottom: '80px', width: '300px', maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-800">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-amber-400" />
                <span className="text-xs font-semibold text-slate-200">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-medium">
                    {unread} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); markAllRead() }}
                    className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* list */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell size={24} className="text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No notifications yet</p>
                  <p className="text-[10px] text-slate-600 mt-1">SLA breach alerts will appear here</p>
                </div>
              ) : notifications.map(n => (
                <div
                  key={n.id}
                  className={clsx(
                    'px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-surface-600 transition-colors',
                    !n.isRead && 'bg-amber-500/5 border-l-2 border-l-amber-500/40'
                  )}
                  onClick={async () => {
                    await markRead(n.id)
                    if (n.journeyId) { navigate(`/journeys/${n.journeyId}`); setOpen(false) }
                    else setOpen(false)
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={clsx(
                      'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
                      n.isRead ? 'bg-surface-600' : 'bg-amber-500/15 border border-amber-500/30'
                    )}>
                      <Bell size={10} className={n.isRead ? 'text-slate-600' : 'text-amber-400'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={clsx('text-xs font-medium leading-snug', n.isRead ? 'text-slate-400' : 'text-slate-200')}>
                        {n.title}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] text-slate-600">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                        {n.journeyId && (
                          <span className="text-[10px] text-sky-500 flex items-center gap-0.5">
                            <ExternalLink size={9} /> view journey
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Sidebar() {
  const { can } = useRole()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-surface-800 border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Eye size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200 leading-none">1000 EYES</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Dayliff Observability</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, permission }) => {
          if (permission && !can(permission)) return null
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                  isActive
                    ? 'bg-surface-600 text-slate-200 font-medium'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-surface-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className={isActive ? 'text-amber-400' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          )
        })}
        <div className="pt-1">
          <NotificationBell />
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-border space-y-4">
        <RoleSwitcher />
        <ServerStatus />
        <p className="text-[10px] text-slate-600">v0.1.0 · DS Hackathon 2026</p>
      </div>
    </aside>
  )
}

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-grid-pattern">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}
