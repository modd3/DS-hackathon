import { clsx } from 'clsx'

// ── Status Badge ────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    ACTIVE:    { dot: 'dot-active',  bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    STALLED:   { dot: 'dot-stalled', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    COMPLETED: { dot: null,          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    CANCELLED: { dot: null,          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  }
  const cfg = map[status] || map.CANCELLED
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.bg)}>
      {cfg.dot && <span className={cfg.dot} />}
      {status}
    </span>
  )
}

// ── Stage Badge ──────────────────────────────────────────────────────────────
export function StageBadge({ stage }) {
  const map = {
    INQUIRY:   'bg-purple-500/10 text-purple-400 border-purple-500/30',
    DESIGN:    'bg-sky-500/10 text-sky-400 border-sky-500/30',
    QUOTATION: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    DELIVERY:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', map[stage] || 'bg-slate-500/10 text-slate-400 border-slate-500/30')}>
      {stage}
    </span>
  )
}

// ── Metric Card ──────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, accent = 'text-slate-200', icon: Icon }) {
  return (
    <div className="card flex items-start gap-4">
      {Icon && (
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-600 flex items-center justify-center">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">{label}</p>
        <p className={clsx('metric-num text-2xl font-semibold', accent)}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Breach Alert Banner ───────────────────────────────────────────────────────
export function BreachBanner({ count }) {
  if (!count) return null
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
      <span className="dot-breach flex-shrink-0" />
      <span className="font-medium">{count} active SLA breach{count > 1 ? 'es' : ''}</span>
      <span className="text-red-500/60">— journeys require immediate attention</span>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse bg-surface-600 rounded', className)} />
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && <Icon size={40} className="text-slate-600 mb-4" />}
      <p className="text-slate-400 font-medium">{title}</p>
      {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
    </div>
  )
}

// ── Error State ───────────────────────────────────────────────────────────────
export function ErrorState({ message }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
      <span>⚠</span> {message || 'Failed to load data'}
    </div>
  )
}