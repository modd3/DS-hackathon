import { clsx } from 'clsx'
import { Check } from 'lucide-react'

const STAGES = ['INQUIRY', 'DESIGN', 'QUOTATION', 'DELIVERY']

const STAGE_COLORS = {
  INQUIRY:   { active: 'bg-purple-500', ring: 'ring-purple-500/40', text: 'text-purple-400' },
  DESIGN:    { active: 'bg-sky-500',    ring: 'ring-sky-500/40',    text: 'text-sky-400'    },
  QUOTATION: { active: 'bg-amber-500',  ring: 'ring-amber-500/40',  text: 'text-amber-400'  },
  DELIVERY:  { active: 'bg-emerald-500',ring: 'ring-emerald-500/40',text: 'text-emerald-400'},
}

export function StageProgressBar({ currentStage, stages = [] }) {
  const currentIndex = STAGES.indexOf(currentStage)

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex
          const isCurrent   = i === currentIndex
          const isPending   = i > currentIndex
          const colors      = STAGE_COLORS[stage]

          // Find stage record for timing
          const stageRecord = stages.find(s => s.stage === stage)

          return (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ring-4',
                    isCompleted && `${colors.active} ring-transparent text-white`,
                    isCurrent  && `${colors.active} ${colors.ring} text-white shadow-lg`,
                    isPending  && 'bg-surface-600 ring-transparent text-slate-500',
                  )}
                >
                  {isCompleted ? <Check size={14} /> : <span>{i + 1}</span>}
                </div>
                <div className="text-center">
                  <p className={clsx('text-xs font-medium whitespace-nowrap', isCurrent ? colors.text : isPending ? 'text-slate-600' : 'text-slate-400')}>
                    {stage}
                  </p>
                  {stageRecord && (
                    <p className="text-[10px] text-slate-600 whitespace-nowrap">
                      {new Date(stageRecord.enteredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div className={clsx('flex-1 h-px mx-3 transition-all duration-300', isCompleted ? colors.active : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}