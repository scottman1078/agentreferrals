'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Loader2, RefreshCw, AlertTriangle, Bug, ChevronDown,
  CheckCircle2, Clock, XCircle, ArrowUp, ArrowDown, Minus, Sparkles,
} from 'lucide-react'

interface BugRow {
  id: string
  title: string
  description: string | null
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'fixed' | 'wont_fix' | 'duplicate'
  category: 'bug' | 'feature' | 'improvement' | 'task'
  reported_by_email: string | null
  screenshot_url: string | null
  page_url: string | null
  ai_analysis: string | null
  ai_suggested_files: string | null
  fixed_at: string | null
  fixed_by: string | null
  created_at: string
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: ArrowUp },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-600 border-orange-500/30', icon: ArrowUp },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: Minus },
  low: { label: 'Low', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: ArrowDown },
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: AlertTriangle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: Clock },
  fixed: { label: 'Fixed', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
  wont_fix: { label: "Won't Fix", color: 'bg-gray-200 text-gray-600 border-gray-300', icon: XCircle },
  duplicate: { label: 'Duplicate', color: 'bg-gray-200 text-gray-600 border-gray-300', icon: XCircle },
}

const CATEGORY_LABELS = { bug: 'Bug', feature: 'Feature', improvement: 'Improvement', task: 'Task' }

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold border whitespace-nowrap ${className}`}>{label}</span>
}

export default function AdminBugsPage() {
  const [bugs, setBugs] = useState<BugRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [toast, setToast] = useState<string | null>(null)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newSeverity, setNewSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')
  const [newCategory, setNewCategory] = useState<'bug' | 'feature' | 'improvement' | 'task'>('bug')
  const [newPageUrl, setNewPageUrl] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Expanded bug for details
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<BugRow | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const loadBugs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/bugs?status=${filterStatus}`)
      const data = await res.json()
      setBugs(data.bugs || [])
    } catch { showToast('Failed to load') }
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { loadBugs() }, [loadBugs])

  async function handleAdd() {
    if (!newTitle.trim()) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          severity: newSeverity,
          category: newCategory,
          page_url: newPageUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.bug) {
        setBugs((prev) => [data.bug, ...prev])
        setNewTitle(''); setNewDesc(''); setNewPageUrl('')
        setShowAdd(false)
        showToast(`Added: ${data.bug.title}`)
      }
    } catch { showToast('Failed to add') }
    setAddLoading(false)
  }

  async function handleStatusChange(bug: BugRow, newStatus: string) {
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bug.id, status: newStatus }),
      })
      const data = await res.json()
      if (data.bug) {
        setBugs((prev) => prev.map((b) => b.id === bug.id ? data.bug : b))
        showToast(`${bug.title} → ${newStatus}`)
      }
    } catch { showToast('Failed to update') }
  }

  async function handleDelete(bug: BugRow) {
    try {
      const res = await fetch(`/api/admin/bugs?id=${bug.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setBugs((prev) => prev.filter((b) => b.id !== bug.id))
        showToast(`Deleted: ${bug.title}`)
      }
    } catch { showToast('Failed to delete') }
    setConfirmDelete(null)
  }

  const counts = {
    all: bugs.length,
    open: bugs.filter((b) => b.status === 'open').length,
    in_progress: bugs.filter((b) => b.status === 'in_progress').length,
    fixed: bugs.filter((b) => b.status === 'fixed').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Bug Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.open} open · {counts.in_progress} in progress · {counts.fixed} fixed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBugs} disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all">
            <Plus className="w-3.5 h-3.5" /> Report Bug
          </button>
        </div>
      </div>

      {toast && (
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
        {(['all', 'open', 'in_progress', 'fixed'] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === s ? 'bg-card border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            {' '}({counts[s as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
          <h2 className="font-bold text-sm mb-3">Report a Bug or Request</h2>
          <div className="space-y-3">
            <input type="text" placeholder="Title — what's broken or needed?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
            <textarea placeholder="Description — steps to reproduce, expected behavior, etc." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" />
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Severity</label>
                <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as typeof newSeverity)}
                  className="h-9 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
                  className="h-9 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="bug">Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="improvement">Improvement</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="text-[10px] font-semibold text-muted-foreground">Page URL (optional)</label>
                <input type="text" placeholder="/dashboard/settings" value={newPageUrl} onChange={(e) => setNewPageUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleAdd} disabled={addLoading || !newTitle.trim()}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50">
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />} Submit
              </button>
              <button onClick={() => setShowAdd(false)}
                className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : bugs.length === 0 ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <Bug className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No bugs found. Nice!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bugs.map((bug) => {
            const sev = SEVERITY_CONFIG[bug.severity]
            const stat = STATUS_CONFIG[bug.status]
            const isExpanded = expandedId === bug.id

            return (
              <div key={bug.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : bug.id)}>
                  <stat.icon className={`w-4 h-4 shrink-0 ${bug.status === 'fixed' ? 'text-emerald-500' : bug.status === 'open' ? 'text-red-500' : 'text-yellow-500'}`} />

                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-sm ${bug.status === 'fixed' ? 'line-through text-muted-foreground' : ''}`}>
                      {bug.title}
                    </span>
                  </div>

                  <Pill label={CATEGORY_LABELS[bug.category]} className="bg-muted text-muted-foreground border-border" />
                  <Pill label={sev.label} className={sev.color} />
                  <Pill label={stat.label} className={stat.color} />

                  <span className="text-[10px] text-muted-foreground hidden sm:block w-20 text-right">
                    {new Date(bug.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>

                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {bug.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bug.description}</p>
                    )}

                    {bug.page_url && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Page: </span>
                        <span className="font-mono text-primary">{bug.page_url}</span>
                      </div>
                    )}

                    {bug.ai_analysis && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                          <Sparkles className="w-3 h-3" /> AI Analysis
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{bug.ai_analysis}</p>
                        {bug.ai_suggested_files && (
                          <div className="mt-2 text-xs">
                            <span className="font-semibold">Files: </span>
                            <span className="font-mono text-primary">{bug.ai_suggested_files}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {bug.fixed_at && (
                      <div className="text-xs text-emerald-600">
                        Fixed {new Date(bug.fixed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {bug.fixed_by && ` by ${bug.fixed_by}`}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <select
                        value={bug.status}
                        onChange={(e) => handleStatusChange(bug, e.target.value)}
                        className="h-8 px-2 rounded-lg border border-input bg-background text-xs font-semibold"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="fixed">Fixed</option>
                        <option value="wont_fix">Won&apos;t Fix</option>
                        <option value="duplicate">Duplicate</option>
                      </select>

                      <button onClick={() => setConfirmDelete(bug)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors">
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

      {/* Delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-md mx-4 p-6 rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold">Delete Bug</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Delete <span className="font-semibold text-foreground">{confirmDelete.title}</span>?
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
