import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, List, AlertOctagon, Activity,
  ShieldCheck, ChevronDown, Eye, Server, TrendingUp
} from 'lucide-react'
import { useRole, ROLES } from '../../context/RoleContext.jsx'
import { useServerHealth } from '../../hooks/useApi.js'

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',    icon: LayoutDashboard, permission: null                },
  { to: '/journeys',   label: 'Journeys',     icon: List,            permission: 'journey.read'      },
  { to: '/incidents',  label: 'SLA Incidents',icon: AlertOctagon,    permission: 'sla.read'          },
  { to: '/analytics',  label: 'Analytics',    icon: TrendingUp,      permission: 'sla.read'          },
  { to: '/system',     label: 'System Health',icon: Server,          permission: 'system.read'       },
  { to: '/admin',      label: 'Admin',        icon: ShieldCheck,     permission: 'admin.users.manage'},
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