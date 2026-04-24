import { format } from 'date-fns'
import { clsx } from 'clsx'
import {
  PlusCircle, ArrowRight, CheckCircle2, RefreshCw, Handshake,
  MessageSquare, FileUp, AlertTriangle, XOctagon, PackageCheck, Activity
} from 'lucide-react'

const EVENT_CONFIG = {
  REQUEST_CREATED:    { icon: PlusCircle,    color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Request Created'    },
  STAGE_ENTERED:      { icon: ArrowRight,    color: 'text-sky-400',     bg: 'bg-sky-500/15 border-sky-500/30',         label: 'Stage Entered'      },
  STAGE_COMPLETED:    { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Stage Completed'    },
  STATUS_UPDATED:     { icon: RefreshCw,     color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',     label: 'Status Updated'     },
  HANDOFF:            { icon: Handshake,     color: 'text-purple-400',  bg: 'bg-purple-500/15 border-purple-500/30',   label: 'Handoff'            },
  COMMENT_ADDED:      { icon: MessageSquare, color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',     label: 'Comment Added'      },
  DOCUMENT_UPLOADED:  { icon: FileUp,        color: 'text-sky-400',     bg: 'bg-sky-500/15 border-sky-500/30',         label: 'Document Uploaded'  },
  SLA_WARNING:        { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',     label: 'SLA Warning'        },
  SLA_BREACH:         { icon: XOctagon,      color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30',         label: 'SLA Breach'         },
  DELIVERY_CONFIRMED: { icon: PackageCheck,  color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Delivery Confirmed' },
}

function EventNode({ event, isLast }) {
  const cfg = EVENT_CONFIG[event.eventType] || { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: event.eventType }
  const Icon = cfg.icon

  return (
    <div className="flex gap-4 animate-slide-up">
      {/* Left timeline track */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={clsx('w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <Icon size={16} className={cfg.color} />
        </div>
        {!isLast && <div className="w-px flex-1 mt-2 bg-border" />}
      </div>

      {/* Content */}
      <div className={clsx('flex-1 pb-6', isLast && 'pb-0')}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <span className={clsx('text-sm font-medium', cfg.color)}>{cfg.label}</span>
            {event.stage && (
              <span className="ml-2 text-xs text-slate-500 font-mono">[{event.stage}]</span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-mono text-slate-500">
              {format(new Date(event.occurredAt), 'MMM d, HH:mm')}
            </p>
            <p className="text-xs text-slate-600">{event.source}</p>
          </div>
        </div>

        {event.actorName && (
          <p className="text-xs text-slate-500 mb-1">
            by <span className="text-slate-400">{event.actorName}</span>
            {event.actorUserId && <span className="text-slate-600"> ({event.actorUserId})</span>}
          </p>
        )}

        {event.payload && Object.keys(event.payload).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 transition-colors">
              View payload
            </summary>
            <pre className="mt-2 text-xs bg-surface-800 border border-border rounded-lg p-3 overflow-x-auto text-slate-400 font-mono">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export function JourneyTimeline({ events = [] }) {
  if (!events.length) {
    return <p className="text-slate-500 text-sm text-center py-8">No events recorded yet.</p>
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <EventNode key={event.id} event={event} isLast={i === events.length - 1} />
      ))}
    </div>
  )
}