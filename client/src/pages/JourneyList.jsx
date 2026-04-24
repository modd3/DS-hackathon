import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Search, RefreshCw, ArrowRight } from 'lucide-react'
import { useJourneys } from '../hooks/useApi.js'
import { Layout, PageHeader } from '../components/layout/Layout.jsx'
import { StatusBadge, StageBadge, Skeleton, EmptyState, ErrorState } from '../components/shared/ui.jsx'
import { List } from 'lucide-react'

const STATUSES = ['', 'ACTIVE', 'STALLED', 'COMPLETED', 'CANCELLED']

export default function JourneyList() {
  const navigate  = useNavigate()
  const [status, setStatus]   = useState('')
  const [region, setRegion]   = useState('')
  const [search, setSearch]   = useState('')
  const [limit,  setLimit]    = useState(50)

  const { data: journeys, error, isLoading, mutate } = useJourneys({ status, region, limit })

  const filtered = journeys?.filter(j => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      j.title?.toLowerCase().includes(q) ||
      j.customer?.fullName?.toLowerCase().includes(q) ||
      j.externalRef?.toLowerCase().includes(q) ||
      j.customer?.region?.toLowerCase().includes(q)
    )
  }) ?? []

  const regions = [...new Set((journeys ?? []).map(j => j.customer?.region).filter(Boolean))]

  return (
    <Layout>
      <PageHeader
        title="Journey List"
        description="All customer requests tracked across CRM, Engineering and ERP"
        action={
          <button onClick={() => mutate()} className="btn-ghost">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8 w-full"
            placeholder="Search by title, customer, ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select className="select" value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="select" value={limit} onChange={e => setLimit(Number(e.target.value))}>
          {[20, 50, 100].map(l => <option key={l} value={l}>Show {l}</option>)}
        </select>
      </div>

      {error && <ErrorState message={error.message} />}

      {/* Table */}
      {!error && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">
              {isLoading ? 'Loading…' : `${filtered.length} journey${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Ref / Customer','Title','Stage','Status','Region','Events','Breaches','Updated',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({length:8}).map((_,i) => (
                      <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                    ))
                  : filtered.map(j => (
                      <tr key={j.id} className="table-row-hover" onClick={() => navigate(`/journeys/${j.id}`)}>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-slate-500">{j.externalRef || j.id.slice(0,8)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{j.customer?.fullName}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-sm text-slate-200 truncate">{j.title}</p>
                        </td>
                        <td className="px-4 py-3"><StageBadge stage={j.currentStage} /></td>
                        <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                        <td className="px-4 py-3 text-xs text-slate-400">{j.customer?.region || '—'}</td>
                        <td className="px-4 py-3 metric-num text-xs text-slate-400">{j._count?.events ?? 0}</td>
                        <td className="px-4 py-3">
                          {j._count?.slaBreaches > 0
                            ? <span className="flex items-center gap-1 text-xs text-red-400"><span className="dot-breach" />{j._count.slaBreaches}</span>
                            : <span className="text-xs text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(j.updatedAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3">
                          <ArrowRight size={14} className="text-slate-600" />
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>

            {!isLoading && filtered.length === 0 && (
              <EmptyState
                icon={List}
                title="No journeys found"
                description="Try adjusting your filters or send a webhook event to create one."
              />
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}