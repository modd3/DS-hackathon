import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns'
import {
  ArrowLeft, User, MapPin, Phone, Mail, Clock,
  AlertOctagon, RefreshCw, CheckCircle2
} from 'lucide-react'
import { useTimeline } from '../hooks/useApi.js'
import { Layout } from '../components/layout/Layout.jsx'
import { StatusBadge, StageBadge, Skeleton, ErrorState } from '../components/shared/ui.jsx'
import { JourneyTimeline } from '../components/Timeline.jsx'
import { clsx } from 'clsx'

const STAGES = ['INQUIRY', 'DESIGN', 'QUOTATION', 'DELIVERY']

const STAGE_COLORS = {
  INQUIRY:   { active: 'bg-purple-500 border-purple-500', done: 'bg-purple-500/30 border-purple-500/50', text: 'text-purple-400' },
  DESIGN:    { active: 'bg-sky-500 border-sky-500',       done: 'bg-sky-500/30 border-sky-500/50',       text: 'text-sky-400'    },
  QUOTATION: { active: 'bg-amber-500 border-amber-500',   done: 'bg-amber-500/30 border-amber-500/50',   text: 'text-amber-400'  },
  DELIVERY:  { active: 'bg-emerald-500 border-emerald-500', done: 'bg-emerald-500/30 border-emerald-500/50', text: 'text-emerald-400' },
}

function StageStepper({ stages, currentStage, status }) {
  const completedStages = new Set(stages.filter(s => s.exitedAt).map(s => s.stage))
  const currentIdx = STAGES.indexOf(currentStage)

  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((stage, i) => {
        const isDone    = completedStages.has(stage)
        const isCurrent = stage === currentStage
        const isPending = !isDone && !isCurrent
        const colors    = STAGE_COLORS[stage]
        const stageData = stages.find(s => s.stage === stage)
        const durationMins = stageData
          ? differenceInMinutes(stageData.exitedAt ? new Date(stageData.exitedAt) : new Date(), new Date(stageData.enteredAt))
          : null

        return (
          <div key={stage} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={clsx(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                isDone    && `${colors.done} `,
                isCurrent && `${colors.active} shadow-lg`,
                isPending && 'bg-surface-600 border-border'
              )}>
                {isDone
                  ? <CheckCircle2 size={14} className={colors.text} />
                  : <span className={clsx('text-xs font-bold', isCurrent ? 'text-white' : 'text-slate-600')}>{i + 1}</span>
                }
              </div>
              <p className={clsx('text-[10px] font-medium mt-1.5 whitespace-nowrap', isCurrent ? colors.text : isDone ? 'text-slate-400' : 'text-slate-600')}>
                {stage}
              </p>
              {durationMins !== null && (
                <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                  {durationMins < 60 ? `${durationMins}m` : `${Math.round(durationMins / 60)}h`}
                </p>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div className={clsx('flex-1 h-px mx-2 mb-6', i < currentIdx ? 'bg-border-bright' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function BreachCard({ breach }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
      <AlertOctagon size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-red-400">{breach.rule?.name || 'SLA Breach'}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {breach.stage} · breached {formatDistanceToNow(new Date(breach.breachedAt), { addSuffix: true })} ·{' '}
          <span className="metric-num">{breach.durationMins}</span> min elapsed
          {breach.rule?.maxDurationMins && ` (limit: ${breach.rule.maxDurationMins} min)`}
        </p>
      </div>
    </div>
  )
}

export default function JourneyDetail() {
  const { journeyId } = useParams()
  const navigate = useNavigate()
  const { data: journey, error, isLoading, mutate } = useTimeline(journeyId)

  const totalDurationMins = useMemo(() => {
    if (!journey) return null
    const start = new Date(journey.openedAt)
    const end   = journey.closedAt ? new Date(journey.closedAt) : new Date()
    return differenceInMinutes(end, start)
  }, [journey])

  return (
    <Layout>
      {/* Back nav */}
      <button onClick={() => navigate(-1)} className="btn-ghost mb-6 -ml-1">
        <ArrowLeft size={14} /> Back
      </button>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && journey && (
        <div className="space-y-6 animate-fade-in">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-500">{journey.externalRef || journey.id.slice(0, 8)}</span>
                <StatusBadge status={journey.status} />
                <StageBadge stage={journey.currentStage} />
              </div>
              <h1 className="text-xl font-semibold text-slate-100 leading-snug">{journey.title}</h1>
              <p className="text-sm text-slate-500 mt-1">
                Opened {format(new Date(journey.openedAt), 'MMM d, yyyy HH:mm')}
                {journey.closedAt && ` · Closed ${format(new Date(journey.closedAt), 'MMM d, yyyy HH:mm')}`}
                {totalDurationMins !== null && (
                  <span className="ml-2 metric-num text-slate-400">
                    {totalDurationMins < 60
                      ? `${totalDurationMins}m total`
                      : totalDurationMins < 1440
                        ? `${Math.round(totalDurationMins / 60)}h total`
                        : `${Math.round(totalDurationMins / 1440)}d total`}
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => mutate()} className="btn-ghost flex-shrink-0">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Active breaches */}
          {journey.activeBreaches?.length > 0 && (
            <div className="space-y-2">
              {journey.activeBreaches.map(b => <BreachCard key={b.id} breach={b} />)}
            </div>
          )}

          {/* Two-column: customer info + stage stepper */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Customer card */}
            <div className="card space-y-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-600 border border-border flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-200">{journey.customer.fullName}</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {journey.customer.region && (
                  <div className="flex items-center gap-2"><MapPin size={11} /> {journey.customer.region}</div>
                )}
                {journey.customer.email && (
                  <div className="flex items-center gap-2"><Mail size={11} /> {journey.customer.email}</div>
                )}
                {journey.customer.phone && (
                  <div className="flex items-center gap-2"><Phone size={11} /> {journey.customer.phone}</div>
                )}
              </div>
            </div>

            {/* Stage stepper */}
            <div className="card lg:col-span-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5">Journey Progress</p>
              <StageStepper stages={journey.stages} currentStage={journey.currentStage} status={journey.status} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Events',   value: journey.events.length,          accent: 'text-slate-200' },
              { label: 'Stages Entered', value: journey.stages.length,           accent: 'text-sky-400'   },
              { label: 'SLA Breaches',   value: journey.activeBreaches?.length ?? 0, accent: journey.activeBreaches?.length ? 'text-red-400' : 'text-slate-200' },
            ].map(({ label, value, accent }) => (
              <div key={label} className="card text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className={clsx('metric-num text-2xl font-semibold', accent)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={15} className="text-slate-400" />
              <p className="text-sm font-medium text-slate-300">Event Timeline</p>
              <span className="text-xs text-slate-600 ml-auto metric-num">{journey.events.length} events</span>
            </div>
            <JourneyTimeline events={journey.events} />
          </div>

        </div>
      )}
    </Layout>
  )
}
