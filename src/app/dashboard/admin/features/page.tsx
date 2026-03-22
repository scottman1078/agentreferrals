'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Loader2, RefreshCw, AlertTriangle, Lightbulb, ChevronDown,
  CheckCircle2, Clock, XCircle, ImagePlus, X,
} from 'lucide-react'

interface FeatureRow {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix' | 'duplicate'
  reported_by_email: string | null
  screenshot_url: string | null
  page_url: string | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  open: { label: 'Open', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: Lightbulb },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: Clock },
  fixed: { label: 'Done', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  wont_fix: { label: "Won't Do", color: 'bg-gray-200 text-gray-600 border-gray-300', icon: XCircle },
  duplicate: { label: 'Duplicate', color: 'bg-gray-200 text-gray-600 border-gray-300', icon: XCircle },
}

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold border whitespace-nowrap ${className}`}>{label}</span>
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [toast, setToast] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<FeatureRow | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const loadFeatures = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bugs?status=all')
      const data = await res.json()
      setFeatures((data.bugs || []).filter((b: FeatureRow & { category: string }) => b.category === 'feature'))
    } catch { showToast('Failed to load') }
    setLoading(false)
  }, [])

  useEffect(() => { loadFeatures() }, [loadFeatures])

  async function handleAdd() {
    if (!newTitle.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null, severity: 'medium', category: 'feature' }),
      })
      const data = await res.json()
      if (data.bug) {
        setFeatures((prev) => [data.bug, ...prev])
        setNewTitle(''); setNewDesc(''); setShowAdd(false)
        showToast(`Added: ${data.bug.title}`)
      }
    } catch { showToast('Failed to add') }
    setAddLoading(false)
  }

  async function handleStatusChange(feature: FeatureRow, newStatus: string) {
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feature.id, status: newStatus }),
      })
      const data = await res.json()
      if (data.bug) setFeatures((prev) => prev.map((f) => f.id === feature.id ? data.bug : f))
    } catch { showToast('Failed to update') }
  }

  async function handleDelete(feature: FeatureRow) {
    try {
      const res = await fetch(`/api/admin/bugs?id=${feature.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { setFeatures((prev) => prev.filter((f) => f.id !== feature.id)); showToast(`Deleted: ${feature.title}`) }
    } catch { showToast('Failed to delete') }
    setConfirmDelete(null)
  }

  const filtered = filterStatus === 'all' ? features : features.filter((f) => f.status === filterStatus)
  const counts = {
    all: features.length,
    open: features.filter((f) => f.status === 'open').length,
    in_progress: features.filter((f) => f.status === 'in_progress').length,
    fixed: features.filter((f) => f.status === 'fixed').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Feature Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{counts.open} open · {counts.in_progress} in progress · {counts.fixed} done</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadFeatures} disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Request
          </button>
        </div>
      </div>

      {toast && <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">{toast}</div>}

      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
        {[{ key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'in_progress', label: 'In Progress' }, { key: 'fixed', label: 'Done' }].map((s) => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s.key ? 'bg-card border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {s.label} ({counts[s.key as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <h2 className="font-bold text-sm">New Feature Request</h2>
          <input type="text" placeholder="What feature would you like?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <textarea placeholder="Why is this important? How would it work?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={addLoading || !newTitle.trim()}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />} Submit
            </button>
            <button onClick={() => setShowAdd(false)} className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <Lightbulb className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No feature requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((feature) => {
            const stat = STATUS_CONFIG[feature.status] || STATUS_CONFIG.open
            const isExpanded = expandedId === feature.id
            return (
              <div key={feature.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : feature.id)}>
                  <Lightbulb className={`w-4 h-4 shrink-0 ${feature.status === 'fixed' ? 'text-emerald-500' : 'text-yellow-500'}`} />
                  <span className={`flex-1 font-semibold text-sm ${feature.status === 'fixed' ? 'line-through text-muted-foreground' : ''}`}>{feature.title}</span>
                  <Pill label={stat.label} className={stat.color} />
                  <span className="text-[10px] text-muted-foreground hidden sm:block w-20 text-right">
                    {new Date(feature.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {feature.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feature.description}</p>}
                    {feature.screenshot_url && <img src={feature.screenshot_url} alt="Screenshot" className="max-h-48 rounded-lg border border-border" />}
                    {feature.reported_by_email && <p className="text-[10px] text-muted-foreground">Requested by: {feature.reported_by_email}</p>}
                    {feature.page_url && <p className="text-[10px] text-muted-foreground">Page: <span className="font-mono">{feature.page_url}</span></p>}
                    <div className="flex items-center gap-2 pt-2">
                      <select value={feature.status} onChange={(e) => handleStatusChange(feature, e.target.value)}
                        className="h-8 px-2 rounded-lg border border-input bg-background text-xs font-semibold">
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="fixed">Done</option>
                        <option value="wont_fix">Won&apos;t Do</option>
                        <option value="duplicate">Duplicate</option>
                      </select>
                      <button onClick={() => setConfirmDelete(feature)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-md mx-4 p-6 rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6 text-destructive" /></div>
              <h3 className="text-lg font-bold">Delete Feature Request</h3>
              <p className="text-sm text-muted-foreground mt-2">Delete <span className="font-semibold text-foreground">{confirmDelete.title}</span>?</p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
