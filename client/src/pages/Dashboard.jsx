import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, AlertOctagon, CheckCircle2, Pause, RefreshCw } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { useJourneys } from '../hooks/useApi.js'
import { Layout, PageHeader } from '../components/layout/Layout.jsx'
import { MetricCard, StatusBadge, StageBadge, BreachBanner, Skeleton, ErrorState } from '../components/shared/ui.jsx'

const STATUS_COLORS = { ACTIVE: '#10b981', STALLED: '#f59e0b', COMPLETED: '#38bdf8', CANCELLED: '#64748b' }
const STAGE_COLORS  = { INQUIRY: '#a78bfa', DESIGN: '#38bdf8', QUOTATION: '#f59e0b', DELIVERY: '#34d399' }

function JourneyRow({ j, onClick }) {
  return (
    <tr className="table-row-hover" onClick={() => onClick(j.id)}>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-200 font-medium truncate max-w-[260px]">{j.title}</p>
        <p className="text-xs text-slate-500 truncate">{j.customer?.fullName}</p>
      </td>
      <td className="px-4 py-3"><StageBadge stage={j.currentStage} /></td>
      <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
      <td className="px-4 py-3 metric-num text-xs text-slate-400">{j._count?.events ?? 0}</td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {formatDistanceToNow(new Date(j.updatedAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-3">
        {j._count?.slaBreaches > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-red-400">
            <span className="dot-breach" /> {j._count.slaBreaches}
          </span>
        )}
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const [region, setRegion] = useState('')
  const navigate = useNavigate()
  const { data: journeys, error, isLoading, mutate } = useJourneys({ region, limit: 50 })

  const stats = useMemo(() => {
    if (!journeys) return null
    const counts = { ACTIVE: 0, STALLED: 0, COMPLETED: 0, CANCELLED: 0 }
    const stages  = { INQUIRY: 0, DESIGN: 0, QUOTATION: 0, DELIVERY: 0 }
    let breached  = 0
    journeys.forEach(j => {
      counts[j.status] = (counts[j.status] || 0) + 1
      stages[j.currentStage] = (stages[j.currentStage] || 0) + 1
      if (j._count?.slaBreaches > 0 && j.status !== 'COMPLETED') breached++
    })
    return { counts, stages, breached, total: journeys.length }
  }, [journeys])

  const pieData  = stats ? Object.entries(stats.counts).filter(([,v]) => v > 0).map(([k,v]) => ({ name: k, value: v })) : []
  const barData  = stats ? Object.entries(stats.stages).filter(([,v]) => v > 0).map(([k,v]) => ({ stage: k, count: v })) : []
  const regions  = useMemo(() => {
    if (!journeys) return []
    return [...new Set(journeys.map(j => j.customer?.region).filter(Boolean))]
  }, [journeys])

  const recent = journeys?.slice(0, 8) ?? []

  return (
    <Layout>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time view of customer journeys across all departments"
        action={
          <button onClick={() => mutate()} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* SLA breach banner */}
      {stats?.breached > 0 && <div className="mb-6"><BreachBanner count={stats.breached} /></div>}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading
          ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (<>
              <MetricCard label="Total Journeys" value={stats?.total}       accent="text-slate-200"   icon={Activity}     />
              <MetricCard label="Active"          value={stats?.counts.ACTIVE}   accent="text-emerald-400" icon={Activity}     sub="in progress" />
              <MetricCard label="Stalled"         value={stats?.counts.STALLED}  accent="text-amber-400"   icon={Pause}        sub="need attention" />
              <MetricCard label="Completed"       value={stats?.counts.COMPLETED}accent="text-sky-400"     icon={CheckCircle2} sub="all time" />
            </>)
        }
      </div>

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Donut */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Journey Status Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {pieData.map(e => (
                <div key={e.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: STATUS_COLORS[e.name] }} />
                  {e.name} <span className="text-slate-500 font-mono">{e.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart by stage */}
          <div className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Journeys by Current Stage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: '#1a2234' }}
                />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {barData.map(entry => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent journeys table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-slate-300">Recent Journeys</h3>
          <div className="flex items-center gap-3">
            <select value={region} onChange={e => setRegion(e.target.value)} className="select text-xs py-1">
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={() => navigate('/journeys')} className="btn-ghost text-xs py-1">View all →</button>
          </div>
        </div>

        {error && <div className="p-5"><ErrorState message={error.message} /></div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Journey / Customer','Stage','Status','Events','Updated','Breaches'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({length:5}).map((_,i) => (
                      <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                    ))
                  : recent.map(j => <JourneyRow key={j.id} j={j} onClick={id => navigate(`/journeys/${id}`)} />)
                }
              </tbody>
            </table>
            {!isLoading && recent.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-10">No journeys found. Send a webhook event to get started.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}