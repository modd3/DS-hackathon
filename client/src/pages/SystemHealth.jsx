import { useState } from 'react'
import { RefreshCw, Server, Inbox, AlertTriangle, Zap, RotateCcw } from 'lucide-react'
import { useQueueStats, useQueueHealth, useDeadLetters } from '../hooks/useApi.js'
import { apiFetch } from '../config/config.js'
import { Layout, PageHeader } from '../components/layout/Layout.jsx'
import { MetricCard, Skeleton, ErrorState } from '../components/shared/ui.jsx'
import { clsx } from 'clsx'
import { format } from 'date-fns'

function HealthIndicator({ status }) {
  const map = {
    healthy:  { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    degraded: { bg: 'bg-amber-500/15 border-amber-500/30',     text: 'text-amber-400',   dot: 'bg-amber-500'  },
    down:     { bg: 'bg-red-500/15 border-red-500/30',         text: 'text-red-400',     dot: 'bg-red-500'    },
  }
  const cfg = map[status] || map.down
  return (
    <div className={clsx('inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium', cfg.bg, cfg.text)}>
      <span className={clsx('w-2 h-2 rounded-full animate-pulse-slow', cfg.dot)} />
      {status?.toUpperCase() || 'UNKNOWN'}
    </div>
  )
}

function DeadLetterRow({ item, onRequeue }) {
  const [requeueing, setRequeueing] = useState(false)
  const [done, setDone] = useState(false)

  async function handleRequeue() {
    setRequeueing(true)
    try {
      await apiFetch(`/api/internal/queue/dead-letters/${item.id}/requeue`, { method: 'POST', auth: true })
      setDone(true)
    } catch (e) {
      alert(e.message)
    } finally {
      setRequeueing(false)
    }
  }

  return (
    <div className={clsx('flex items-start gap-4 p-4 border-b border-border last:border-0', done && 'opacity-40')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-slate-500">{item.id}</span>
          <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
            {item.attempts} attempt{item.attempts !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate">{item.reason || 'Unknown failure'}</p>
        {item.normalized && (
          <p className="text-xs text-slate-600 mt-0.5">
            {item.normalized.event?.type} · {item.normalized.journeyExternalRef}
          </p>
        )}
      </div>
      <button
        onClick={handleRequeue}
        disabled={requeueing || done}
        className="btn-ghost text-xs flex-shrink-0"
      >
        <RotateCcw size={12} /> {done ? 'Requeued' : requeueing ? '…' : 'Requeue'}
      </button>
    </div>
  )
}

export default function SystemHealth() {
  const { data: stats,   error: statsError,  isLoading: statsLoading,  mutate: mutateStats  } = useQueueStats()
  const { data: health,  error: healthError, isLoading: healthLoading, mutate: mutateHealth } = useQueueHealth()
  const { data: dlq,     error: dlqError,    isLoading: dlqLoading,    mutate: mutateDlq    } = useDeadLetters()

  const [dispatching, setDispatching] = useState(false)
  const [dispatchResult, setDispatchResult] = useState(null)

  async function handleDispatch() {
    setDispatching(true)
    setDispatchResult(null)
    try {
      const r = await apiFetch('/api/internal/alerts/dispatch', { method: 'POST', auth: true, body: JSON.stringify({ limit: 100 }) })
      setDispatchResult(r.data)
    } catch (e) {
      alert(e.message)
    } finally {
      setDispatching(false)
    }
  }

  function refresh() { mutateStats(); mutateHealth(); mutateDlq() }

  return (
    <Layout>
      <PageHeader
        title="System Health"
        description="Queue broker metrics, dead-letter queue and alert dispatch controls"
        action={
          <button onClick={refresh} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Broker status */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">Broker Health</h3>
          {healthLoading ? <Skeleton className="h-7 w-24" /> : health && <HealthIndicator status={health.status} />}
        </div>
        {healthError && <ErrorState message={healthError.message} />}
        {health && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Provider: <span className="font-mono text-slate-400">{health.provider}</span></p>
            {health.issues?.length > 0
              ? <div className="space-y-1 mt-2">{health.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" /> {issue}
                  </div>
                ))}</div>
              : <p className="text-xs text-emerald-400 mt-1">No issues detected</p>
            }
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading
          ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : stats && (<>
              <MetricCard label="Queued"       value={stats.queued}       accent={stats.queued > 100 ? 'text-amber-400' : 'text-slate-200'} icon={Inbox}  />
              <MetricCard label="Dead Letters" value={stats.deadLetters}  accent={stats.deadLetters > 0 ? 'text-red-400' : 'text-slate-200'} icon={AlertTriangle} />
              <MetricCard label="In-Flight"    value={stats.inFlight ? '1' : '0'}  accent={stats.inFlight ? 'text-amber-400' : 'text-slate-200'} icon={Zap} sub={stats.inFlight ? 'processing' : 'idle'} />
              <MetricCard label="Max Attempts" value={stats.maxAttempts}  accent="text-slate-200" icon={Server} />
            </>)
        }
        {statsError && <div className="col-span-4"><ErrorState message={statsError.message} /></div>}
      </div>

      {/* Provider details */}
      {stats && (
        <div className="card mb-8 text-xs space-y-2">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Broker Configuration</h3>
          {[
            ['Provider',    stats.provider],
            ['State File',  stats.brokerStateFile || '—'],
            ['Stream Key',  stats.streamKey || '—'],
            ['DLQ Key',     stats.deadLetterStreamKey || '—'],
            ['Consumer Group', stats.consumerGroup || '—'],
            ['Max Queue Size', stats.maxQueueSize?.toLocaleString() || '—'],
          ].map(([k,v]) => (
            <div key={k} className="flex items-center gap-4">
              <span className="text-slate-500 w-36 flex-shrink-0">{k}</span>
              <span className="font-mono text-slate-400">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alert dispatch */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-300">Alert Dispatch</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manually trigger pending alert delivery (auto-runs every 60s)</p>
          </div>
          <button onClick={handleDispatch} disabled={dispatching} className="btn-primary">
            <Zap size={14} /> {dispatching ? 'Dispatching…' : 'Dispatch Now'}
          </button>
        </div>
        {dispatchResult && (
          <div className="flex items-center gap-6 text-xs bg-surface-800 rounded-lg px-4 py-3 border border-border">
            {[['Scanned', dispatchResult.scanned], ['Sent', dispatchResult.sent], ['Failed', dispatchResult.failed]].map(([k,v]) => (
              <div key={k}>
                <span className="text-slate-500">{k} </span>
                <span className={clsx('metric-num font-semibold', k === 'Failed' && v > 0 ? 'text-red-400' : k === 'Sent' && v > 0 ? 'text-emerald-400' : 'text-slate-300')}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dead-letter queue */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Dead-Letter Queue</h3>
          <span className="metric-num text-xs text-slate-500">{dlq?.length ?? 0} messages</span>
        </div>
        {dlqError && <div className="p-5"><ErrorState message={dlqError.message} /></div>}
        {dlqLoading && <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>}
        {!dlqLoading && !dlqError && (
          dlq?.length
            ? dlq.map(item => <DeadLetterRow key={item.id} item={item} onRequeue={mutateDlq} />)
            : <p className="text-center text-slate-500 text-sm py-8">Dead-letter queue is empty.</p>
        )}
      </div>
    </Layout>
  )
}