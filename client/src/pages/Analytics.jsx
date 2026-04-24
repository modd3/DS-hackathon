import { useMemo } from 'react'
import { RefreshCw, TrendingUp, Clock, BarChart2, MapPin } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PieChart, Pie
} from 'recharts'
import { useAnalytics } from '../hooks/useApi.js'
import { Layout, PageHeader } from '../components/layout/Layout.jsx'
import { MetricCard, Skeleton, ErrorState } from '../components/shared/ui.jsx'
import { clsx } from 'clsx'

const TOOLTIP_STYLE = { background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }
const STAGE_COLORS  = { INQUIRY: '#a78bfa', DESIGN: '#38bdf8', QUOTATION: '#f59e0b', DELIVERY: '#34d399' }
const STATUS_COLORS = { ACTIVE: '#10b981', STALLED: '#f59e0b', COMPLETED: '#38bdf8', CANCELLED: '#64748b' }

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-slate-400" />
      <h2 className="text-sm font-semibold text-slate-300">{title}</h2>
    </div>
  )
}

function DurationBar({ stage, stats, slaLimitMins }) {
  const pct = slaLimitMins ? Math.min((stats.avg / slaLimitMins) * 100, 100) : 0
  const breached = stats.avg > slaLimitMins
  const color = STAGE_COLORS[stage]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color }}>{stage}</span>
        <div className="flex items-center gap-3 text-slate-500">
          <span>avg <span className="metric-num text-slate-300">{stats.avg < 60 ? `${stats.avg}m` : `${Math.round(stats.avg / 60)}h`}</span></span>
          <span>min <span className="metric-num">{stats.min < 60 ? `${stats.min}m` : `${Math.round(stats.min / 60)}h`}</span></span>
          <span>max <span className="metric-num">{stats.max < 60 ? `${stats.max}m` : `${Math.round(stats.max / 60)}h`}</span></span>
          <span className="text-slate-600">n={stats.count}</span>
        </div>
      </div>
      <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', breached ? 'bg-red-500' : '')}
          style={{ width: `${pct}%`, background: breached ? undefined : color, opacity: 0.8 }}
        />
      </div>
      {slaLimitMins && (
        <p className={clsx('text-[10px]', breached ? 'text-red-400' : 'text-slate-600')}>
          SLA limit: {slaLimitMins < 60 ? `${slaLimitMins}m` : `${Math.round(slaLimitMins / 60)}h`}
          {breached && ' — avg exceeds SLA'}
        </p>
      )}
    </div>
  )
}

const SLA_LIMITS = { INQUIRY: 120, DESIGN: 2880, QUOTATION: 1440, DELIVERY: 4320 }

export default function Analytics() {
  const { data, error, isLoading, mutate } = useAnalytics({ limit: 200 })

  const stageDurationChart = useMemo(() => {
    if (!data?.stageDurations) return []
    return Object.entries(data.stageDurations)
      .filter(([, s]) => s.count > 0)
      .map(([stage, s]) => ({
        stage,
        avg: s.avg,
        min: s.min,
        max: s.max,
        sla: SLA_LIMITS[stage],
      }))
  }, [data])

  const statusChart = useMemo(() => {
    if (!data?.statusCounts) return []
    return Object.entries(data.statusCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [data])

  const regionChart = useMemo(() => {
    if (!data?.regionCounts) return []
    return Object.entries(data.regionCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([region, count]) => ({ region, count }))
  }, [data])

  const breachChart = useMemo(() => {
    if (!data?.breachByStage) return []
    return Object.entries(data.breachByStage).map(([stage, count]) => ({ stage, count }))
  }, [data])

  const throughputChart = useMemo(() => {
    if (!data?.completedThroughput) return []
    return data.completedThroughput.map(j => ({
      ref: j.ref,
      days: +(j.totalMins / 1440).toFixed(1),
    }))
  }, [data])

  const completionRate = useMemo(() => {
    if (!data?.statusCounts) return null
    const { COMPLETED = 0, CANCELLED = 0, ACTIVE = 0, STALLED = 0 } = data.statusCounts
    const total = COMPLETED + CANCELLED + ACTIVE + STALLED
    return total ? Math.round((COMPLETED / total) * 100) : 0
  }, [data])

  return (
    <Layout>
      <PageHeader
        title="Analytics"
        description="Stage durations, throughput, and SLA performance across all journeys"
        action={
          <button onClick={() => mutate()} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {error && <ErrorState message={error.message} />}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : data && (<>
              <MetricCard label="Total Journeys"   value={data.totalJourneys}                    accent="text-slate-200"   icon={BarChart2}  />
              <MetricCard label="Completed"         value={data.statusCounts?.COMPLETED ?? 0}     accent="text-sky-400"     icon={TrendingUp} sub="delivered" />
              <MetricCard label="Completion Rate"   value={completionRate != null ? `${completionRate}%` : '—'} accent="text-emerald-400" icon={TrendingUp} />
              <MetricCard label="Total Breaches"    value={Object.values(data.breachByStage ?? {}).reduce((s, v) => s + v, 0)} accent={Object.values(data.breachByStage ?? {}).reduce((s, v) => s + v, 0) > 0 ? 'text-red-400' : 'text-slate-200'} icon={Clock} />
            </>)
        }
      </div>

      {!isLoading && !error && data && (
        <div className="space-y-6">

          {/* Stage duration analysis */}
          <div className="card">
            <SectionHeader icon={Clock} title="Average Time per Stage" />
            <div className="space-y-5">
              {Object.entries(data.stageDurations)
                .filter(([, s]) => s.count > 0)
                .map(([stage, stats]) => (
                  <DurationBar key={stage} stage={stage} stats={stats} slaLimitMins={SLA_LIMITS[stage]} />
                ))
              }
              {Object.values(data.stageDurations).every(s => s.count === 0) && (
                <p className="text-slate-500 text-sm text-center py-4">No stage data yet — seed journeys first.</p>
              )}
            </div>
          </div>

          {/* Stage duration chart + breach by stage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <SectionHeader icon={BarChart2} title="Avg Stage Duration vs SLA (hours)" />
              {stageDurationChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stageDurationChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v < 60 ? `${v}m` : `${Math.round(v / 60)}h`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                      formatter={(v, name) => [v < 60 ? `${v}m` : `${Math.round(v / 60)}h`, name]} />
                    <Bar dataKey="avg" name="Avg Duration" radius={[4, 4, 0, 0]}>
                      {stageDurationChart.map(e => (
                        <Cell key={e.stage} fill={e.avg > e.sla ? '#ef4444' : STAGE_COLORS[e.stage]} opacity={0.85} />
                      ))}
                    </Bar>
                    <Bar dataKey="sla" name="SLA Limit" radius={[4, 4, 0, 0]} fill="#1e2d45" opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-500 text-sm text-center py-10">No data</p>}
            </div>

            <div className="card">
              <SectionHeader icon={Clock} title="SLA Breaches by Stage" />
              {breachChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={breachChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                    <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Breaches" radius={[4, 4, 0, 0]}>
                      {breachChart.map(e => (
                        <Cell key={e.stage} fill={STAGE_COLORS[e.stage]} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-500 text-sm text-center py-10">No breaches recorded</p>}
            </div>
          </div>

          {/* Status distribution + region breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <SectionHeader icon={BarChart2} title="Journey Status Distribution" />
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value">
                    {statusChart.map(e => (
                      <Cell key={e.name} fill={STATUS_COLORS[e.name]} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {statusChart.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS[e.name] }} />
                    {e.name} <span className="metric-num text-slate-500">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <SectionHeader icon={MapPin} title="Journeys by Region" />
              {regionChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={regionChart} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="region" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Journeys" radius={[0, 4, 4, 0]} fill="#38bdf8" opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-500 text-sm text-center py-10">No region data</p>}
            </div>
          </div>

          {/* Completed journey throughput */}
          {throughputChart.length > 0 && (
            <div className="card">
              <SectionHeader icon={TrendingUp} title="Completed Journey Duration (days) — fastest 20" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={throughputChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                  <XAxis dataKey="ref" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}d`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} days`]} />
                  <Bar dataKey="days" name="Duration" radius={[4, 4, 0, 0]} fill="#34d399" opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      )}
    </Layout>
  )
}
