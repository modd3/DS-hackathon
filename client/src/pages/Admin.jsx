import { useState } from 'react'
import { ShieldCheck, Users, BookOpen, Lock, Eye, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Layout, PageHeader } from '../components/layout/Layout.jsx'
import { useRole, ROLES } from '../context/RoleContext.jsx'
import { useSlaRules } from '../hooks/useApi.js'
import { apiFetch } from '../config/config.js'
import { Skeleton, ErrorState } from '../components/shared/ui.jsx'
import { clsx } from 'clsx'

const PERMISSIONS = [
  { code: 'journey.read',       label: 'View Journeys',    description: 'List and view journey timelines' },
  { code: 'journey.update',     label: 'Update Journeys',  description: 'Modify journey data and stages' },
  { code: 'sla.read',           label: 'View SLA Rules',   description: 'See SLA thresholds and incidents' },
  { code: 'sla.manage',         label: 'Manage SLA Rules', description: 'Create and modify SLA rules' },
  { code: 'alerts.read',        label: 'View Alerts',      description: 'See alert status and history' },
  { code: 'system.read',        label: 'System Health',    description: 'Queue metrics and broker status' },
  { code: 'admin.users.manage', label: 'User Management',  description: 'Manage roles and access' },
]

const STAGES   = ['INQUIRY', 'DESIGN', 'QUOTATION', 'DELIVERY']
const CHANNELS = ['IN_APP', 'EMAIL', 'SMS']

const STAGE_DEFAULTS = {
  INQUIRY:   { maxDurationMins: 120  },
  DESIGN:    { maxDurationMins: 2880 },
  QUOTATION: { maxDurationMins: 1440 },
  DELIVERY:  { maxDurationMins: 4320 },
}

function fmtMins(m) {
  if (!m) return '—'
  if (m < 60)   return `${m}m`
  if (m < 1440) return `${Math.round(m / 60)}h`
  return `${Math.round(m / 1440)}d`
}

// ── Inline edit row ──────────────────────────────────────────────────────────
function EditRow({ rule, onSave, onCancel }) {
  const [maxMins, setMaxMins]       = useState(String(rule.maxDurationMins))
  const [desc, setDesc]             = useState(rule.description || '')
  const [channels, setChannels]     = useState(rule.alertChannels || [])
  const [recipients, setRecipients] = useState((rule.alertRecipients || []).join(', '))
  const [saving, setSaving]         = useState(false)

  function toggleChannel(ch) {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(rule.id, {
        maxDurationMins: Number(maxMins),
        description: desc,
        alertChannels: channels,
        alertRecipients: recipients.split(',').map(s => s.trim()).filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="bg-surface-600/50">
      <td className="px-4 py-3 font-mono text-xs text-sky-400">{rule.stage}</td>
      <td className="px-4 py-3">
        <input className="input text-xs w-full" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input className="input text-xs w-20 metric-num" type="number" min="1" value={maxMins} onChange={e => setMaxMins(e.target.value)} />
          <span className="text-xs text-slate-500">min</span>
          <span className="text-xs text-slate-600 ml-1">({fmtMins(Number(maxMins))})</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {CHANNELS.map(ch => (
            <button key={ch} onClick={() => toggleChannel(ch)}
              className={clsx('text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                channels.includes(ch)
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                  : 'bg-surface-600 border-border text-slate-600 hover:text-slate-400'
              )}>
              {ch}
            </button>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <input className="input text-xs w-full" value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="email1, email2" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1 px-2">
            <Check size={12} /> {saving ? '…' : 'Save'}
          </button>
          <button onClick={onCancel} className="btn-ghost text-xs py-1 px-2">
            <X size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── New rule form row ────────────────────────────────────────────────────────
function NewRuleRow({ onSave, onCancel }) {
  const [stage, setStage]           = useState('INQUIRY')
  const [name, setName]             = useState('')
  const [desc, setDesc]             = useState('')
  const [maxMins, setMaxMins]       = useState(String(STAGE_DEFAULTS['INQUIRY'].maxDurationMins))
  const [channels, setChannels]     = useState(['IN_APP', 'EMAIL'])
  const [recipients, setRecipients] = useState('')
  const [saving, setSaving]         = useState(false)

  function toggleChannel(ch) {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  async function handleSave() {
    if (!name.trim()) { alert('Rule name is required'); return }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: desc,
        stage,
        maxDurationMins: Number(maxMins),
        alertChannels: channels,
        alertRecipients: recipients.split(',').map(s => s.trim()).filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="bg-emerald-500/5 border-t border-emerald-500/20">
      <td className="px-4 py-3">
        <select className="select text-xs" value={stage}
          onChange={e => { setStage(e.target.value); setMaxMins(String(STAGE_DEFAULTS[e.target.value]?.maxDurationMins || 60)) }}>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 space-y-1">
        <input className="input text-xs w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Rule name *" />
        <input className="input text-xs w-full" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input className="input text-xs w-20 metric-num" type="number" min="1" value={maxMins} onChange={e => setMaxMins(e.target.value)} />
          <span className="text-xs text-slate-500">min</span>
          <span className="text-xs text-slate-600 ml-1">({fmtMins(Number(maxMins))})</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {CHANNELS.map(ch => (
            <button key={ch} onClick={() => toggleChannel(ch)}
              className={clsx('text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                channels.includes(ch)
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                  : 'bg-surface-600 border-border text-slate-600 hover:text-slate-400'
              )}>
              {ch}
            </button>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <input className="input text-xs w-full" value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="email1, email2" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1 px-2">
            <Check size={12} /> {saving ? '…' : 'Add'}
          </button>
          <button onClick={onCancel} className="btn-ghost text-xs py-1 px-2"><X size={12} /></button>
        </div>
      </td>
    </tr>
  )
}

// ── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ roleKey, roleInfo }) {
  const { role } = useRole()
  const isActive = role === roleKey
  return (
    <div className={clsx('card transition-all duration-200', isActive && 'border-amber-500/50 bg-amber-500/5')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={clsx('text-sm font-semibold', roleInfo.color)}>{roleInfo.label}</p>
          {isActive && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded mt-1 inline-block">Active Role</span>}
        </div>
        <Eye size={14} className="text-slate-600" />
      </div>
      <div className="space-y-1">
        {PERMISSIONS.map(p => {
          const has = roleInfo.permissions.includes(p.code)
          return (
            <div key={p.code} className={clsx('flex items-center gap-2 text-xs py-0.5', has ? 'text-slate-300' : 'text-slate-600')}>
              <span className={clsx('w-3 h-3 rounded-sm flex items-center justify-center text-[9px] flex-shrink-0', has ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-600 text-slate-600')}>
                {has ? '✓' : '—'}
              </span>
              {p.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  const { can } = useRole()
  const { data: rules, error: rulesError, isLoading: rulesLoading, mutate: mutateRules } = useSlaRules()
  const [editingId, setEditingId] = useState(null)
  const [showNewRow, setShowNewRow] = useState(false)

  async function handleUpdate(id, patch) {
    await apiFetch(`/api/internal/sla/rules/${id}`, {
      method: 'PATCH', auth: true, body: JSON.stringify(patch)
    })
    mutateRules()
    setEditingId(null)
  }

  async function handleCreate(body) {
    await apiFetch('/api/internal/sla/rules', {
      method: 'POST', auth: true, body: JSON.stringify(body)
    })
    mutateRules()
    setShowNewRow(false)
  }

  async function handleToggle(rule) {
    await apiFetch(`/api/internal/sla/rules/${rule.id}`, {
      method: 'PATCH', auth: true, body: JSON.stringify({ isActive: !rule.isActive })
    })
    mutateRules()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this SLA rule? Existing breaches will be retained.')) return
    await apiFetch(`/api/internal/sla/rules/${id}`, { method: 'DELETE', auth: true })
    mutateRules()
  }

  const canManage = can('sla.manage')

  return (
    <Layout>
      <PageHeader title="Administration" description="SLA rules configuration and role-based access control" />

      {!can('admin.users.manage') && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm mb-6">
          <Lock size={14} /> You have read-only access. Switch to Admin role to edit.
        </div>
      )}

      {/* SLA Rules */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">SLA Rules</h2>
          </div>
          {canManage && !showNewRow && (
            <button onClick={() => setShowNewRow(true)} className="btn-primary text-xs py-1.5">
              <Plus size={13} /> New Rule
            </button>
          )}
        </div>

        {rulesError && <ErrorState message={rulesError.message} />}

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Stage', 'Description', 'Max Duration', 'Alert Channels', 'Recipients', canManage ? 'Actions' : ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rulesLoading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))}

              {!rulesLoading && rules?.map(rule => (
                editingId === rule.id
                  ? <EditRow key={rule.id} rule={rule} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
                  : (
                    <tr key={rule.id} className={clsx('hover:bg-surface-600 transition-colors', !rule.isActive && 'opacity-40')}>
                      <td className="px-4 py-3 font-mono text-xs text-sky-400">{rule.stage}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{rule.description || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="metric-num text-sm text-slate-200">{fmtMins(rule.maxDurationMins)}</span>
                        <span className="text-xs text-slate-600 ml-1">({rule.maxDurationMins} min)</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(rule.alertChannels || []).map(ch => (
                            <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">{ch}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                        {(rule.alertRecipients || []).join(', ') || '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleToggle(rule)}
                              className={clsx('text-[10px] px-2 py-0.5 rounded border transition-colors',
                                rule.isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
                                  : 'bg-surface-600 border-border text-slate-500 hover:text-emerald-400'
                              )}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </button>
                            <button onClick={() => setEditingId(rule.id)} className="btn-ghost p-1.5"><Pencil size={12} /></button>
                            <button onClick={() => handleDelete(rule.id)} className="btn-ghost p-1.5 hover:text-red-400"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
              ))}

              {showNewRow && (
                <NewRuleRow onSave={handleCreate} onCancel={() => setShowNewRow(false)} />
              )}

              {!rulesLoading && !rules?.length && !showNewRow && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No SLA rules defined. Run <code className="text-slate-400 bg-surface-600 px-1 rounded">npx prisma db seed</code> or add one above.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* RBAC Matrix */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-300">Role Permissions Matrix</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          The role switcher in the sidebar simulates RBAC. In production, roles would be assigned from the <span className="font-mono text-slate-400">User / UserRole</span> tables and verified via JWT claims.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(ROLES).map(([key, info]) => (
            <RoleCard key={key} roleKey={key} roleInfo={info} />
          ))}
        </div>
      </section>

      {/* Permission reference */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-300">Permission Reference</h2>
        </div>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Code', 'Label', 'Description'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSIONS.map(p => (
                <tr key={p.code} className="hover:bg-surface-600 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-amber-400">{p.code}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{p.label}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
