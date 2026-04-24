import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { AlertOctagon, RefreshCw, Clock, CheckCircle2 } from 'lucide-react'
import { useJourneys } from '../hooks/useApi.js'
import { Layout, PageHeader } from '../components/layout/Layout.jsx'
import { StageBadge, Skeleton, EmptyState, ErrorState, MetricCard } from '../components/shared/ui.jsx'

// We derive incident data from journeys that have slaBreaches > 0.
// For the full breach data, we load each journey timeline via cascading (deferred).
// For the demo we show what's available from the list endpoint.

function IncidentRow({ journey, navigate }) {
  const hasActive = journey._count?.slaBreaches > 0 && journey.status !== 'COMPLETED'
  return (
    <div
      className="card-tight flex items-start gap-4 cursor-pointer hover:border-border-bright transition-colors animate-slide-up"
      onClick={() => navigate(`/journeys/${journey.id}`)}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${hasActive ? 'bg-red-500/15 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
        {hasActive
          ? <AlertOctagon size={16} className="text-red-400" />
          : <CheckCircle2 size={16} className="text-emerald-400" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{journey.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{journey.customer?.fullName} · {journey.customer?.region || 'No region'}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <StageBadge stage={journey.currentStage} />
            <p className="text-[10px] text-slate-600 mt-1 font-mono">{journey.externalRef || journey.id.slice(0,8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className={`flex items-center gap-1.5 ${hasActive ? 'text-red-400' : 'text-slate-500'}`}>
            {hasActive && <span className="dot-breach" />}
            <Clock size={11} />
            <span className="metric-num">{journey._count?.slaBreaches ?? 0}</span>
            <span>{hasActive ? 'active breach' : 'breach'}{ journey._count?.slaBreaches !== 1 ? 'es' : '' }</span>
          </div>
          <span className="text-slate-600">
            Updated {formatDistanceToNow(new Date(journey.updatedAt), { addSuffix: true })}
          </span>
          <span className="text-slate-600">
            Since {format(new Date(journey.openedAt), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Incidents() {
  const navigate = useNavigate()
  const { data: allJourneys, error, isLoading, mutate } = useJourneys({ limit: 100 })

  const { breaching, totalBreaches, stalledCount } = useMemo(() => {
    if (!allJourneys) return { breaching: [], totalBreaches: 0, stalledCount: 0 }
    const breaching     = allJourneys.filter(j => (j._count?.slaBreaches ?? 0) > 0).sort((a,b) => b._count.slaBreaches - a._count.slaBreaches)
    const totalBreaches = breaching.reduce((s, j) => s + j._count.slaBreaches, 0)
    const stalledCount  = allJourneys.filter(j => j.status === 'STALLED').length
    return { breaching, totalBreaches, stalledCount }
  }, [allJourneys])

  return (
    <Layout>
      <PageHeader
        title="SLA Incidents"
        description="Journeys that have breached or are approaching SLA thresholds"
        action={
          <button onClick={() => mutate()} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="Journeys with Breaches" value={breaching.length}   accent={breaching.length ? 'text-red-400' : 'text-slate-200'} icon={AlertOctagon} />
        <MetricCard label="Total Breach Records"   value={totalBreaches}      accent={totalBreaches ? 'text-amber-400' : 'text-slate-200'}  icon={Clock}        />
        <MetricCard label="Stalled Journeys"       value={stalledCount}       accent={stalledCount ? 'text-amber-400' : 'text-slate-200'}   icon={AlertOctagon} />
      </div>

      {error && <ErrorState message={error.message} />}

      {/* Incident list */}
      {!error && (
        <div className="space-y-3">
          {isLoading
            ? Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : breaching.length > 0
              ? breaching.map(j => <IncidentRow key={j.id} journey={j} navigate={navigate} />)
              : (
                <EmptyState
                  icon={CheckCircle2}
                  title="No SLA incidents"
                  description="All journeys are within their SLA thresholds."
                />
              )
          }
        </div>
      )}

      {/* Info box */}
      {!error && !isLoading && (
        <div className="mt-8 card bg-surface-800/50 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-400">How breaches are detected</p>
          <p>The SLA worker evaluates all active journeys every <span className="font-mono text-slate-400">{import.meta.env.VITE_SLA_INTERVAL_MS || 300000}ms</span> against rules defined in <span className="font-mono">SlaRule</span> table. When a journey's current stage duration exceeds <span className="font-mono">maxDurationMins</span>, a breach record is created and alerts are queued for dispatch.</p>
          <p className="mt-1">To trigger a breach manually: <code className="text-slate-400 bg-surface-700 px-1 py-0.5 rounded">POST /api/internal/sla/evaluate</code></p>
        </div>
      )}
    </Layout>
  )
}