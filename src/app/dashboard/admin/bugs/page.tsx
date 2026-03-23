'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Loader2, RefreshCw, AlertTriangle, Bug, ChevronDown,
  CheckCircle2, Clock, XCircle, ArrowUp, ArrowDown, Minus,
  ImagePlus, X, Sparkles, ZoomIn, Search,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

function ScreenshotLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="relative group cursor-zoom-in">
        <img src={src} alt={alt} className="max-h-48 rounded-lg border border-border" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setOpen(false)}
        >
          <img src={src} alt={alt} className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </>
  )
}

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
  verified_at: string | null
  verified_by: string | null
  verified_status: 'confirmed' | 'not_fixed' | 'partial' | null
  verification_notes: string | null
  verification_screenshot_url: string | null
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
  const [searchQuery, setSearchQuery] = useState('')
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
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  async function analyzeBug(bug: BugRow) {
    setAnalyzingId(bug.id)
    try {
      const res = await fetch('/api/admin/bugs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugId: bug.id,
          title: bug.title,
          description: bug.description,
          page_url: bug.page_url,
          screenshot_url: bug.screenshot_url,
          severity: bug.severity,
          category: bug.category,
        }),
      })
      const data = await res.json()
      if (data.bug) {
        setBugs((prev) => prev.map((b) => (b.id === bug.id ? data.bug : b)))
        showToast('Analysis complete')
      } else {
        showToast(data.error || 'Analysis failed')
      }
    } catch {
      showToast('Network error during analysis')
    }
    setAnalyzingId(null)
  }

  const { profile } = useAuth()
  const currentUserEmail = profile?.email || 'Admin'

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const loadBugs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/bugs?status=all')
      const data = await res.json()
      setBugs(data.bugs || [])
    } catch { showToast('Failed to load') }
    setLoading(false)
  }, [])

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

  const categoryItems = bugs.filter((b) => b.category !== 'feature')

  const searchFiltered = searchQuery.trim()
    ? categoryItems.filter((b) => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : categoryItems

  const displayItems = filterStatus === 'all' ? searchFiltered
    : filterStatus === 'completed' ? searchFiltered.filter((b) => b.verified_status === 'confirmed')
    : filterStatus === 'not_fixed' ? searchFiltered.filter((b) => b.verified_status === 'not_fixed')
    : searchFiltered.filter((b) => b.status === filterStatus)

  const counts = {
    all: categoryItems.length,
    open: categoryItems.filter((b) => b.status === 'open').length,
    in_progress: categoryItems.filter((b) => b.status === 'in_progress').length,
    fixed: categoryItems.filter((b) => b.status === 'fixed').length,
    completed: categoryItems.filter((b) => b.verified_status === 'confirmed').length,
    not_fixed: categoryItems.filter((b) => b.verified_status === 'not_fixed').length,
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
        <div className="fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl bg-card border border-border shadow-2xl text-sm font-medium max-w-sm animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}

      {/* Search + Status filter tabs */}
      <div className="relative w-full max-w-sm mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search bugs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'open', label: 'Open' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'fixed', label: 'Fixed' },
          { key: 'completed', label: 'Verified' },
          { key: 'not_fixed', label: 'Still Not Fixed' },
        ].map((s) => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === s.key ? 'bg-card border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {s.label} ({counts[s.key as keyof typeof counts] ?? 0})
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
      ) : displayItems.length === 0 ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <Bug className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No bugs found. Nice!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((bug) => {
            const sev = SEVERITY_CONFIG[bug.severity]
            const isVerified = bug.verified_status === 'confirmed'
            const stat = isVerified
              ? { label: 'Verified', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: CheckCircle2 }
              : STATUS_CONFIG[bug.status]
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

                    {/* Analyze button */}
                    <button
                      onClick={() => analyzeBug(bug)}
                      disabled={analyzingId === bug.id}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {analyzingId === bug.id ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> {bug.ai_analysis ? 'Re-analyze' : 'Analyze with AI'}</>
                      )}
                    </button>

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

                    {bug.screenshot_url && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Screenshot</p>
                        <ScreenshotLightbox src={bug.screenshot_url} alt="Bug screenshot" />
                      </div>
                    )}

                    {bug.fixed_at && (
                      <div className="text-xs text-emerald-600">
                        Fixed {new Date(bug.fixed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {bug.fixed_by && ` by ${bug.fixed_by}`}
                      </div>
                    )}

                    {/* Verification status */}
                    {bug.verified_status && (
                      <div className={`p-3 rounded-lg border ${bug.verified_status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <p className={`text-xs font-bold ${bug.verified_status === 'confirmed' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {bug.verified_status === 'confirmed' ? '✓ Verified' : '✗ Still Not Fixed'}
                          {bug.verified_by && ` by ${bug.verified_by}`}
                        </p>
                        {bug.verification_notes && <p className="text-xs text-muted-foreground mt-1">{bug.verification_notes}</p>}
                        {bug.verification_screenshot_url && (
                          <div className="mt-2">
                            <ScreenshotLightbox src={bug.verification_screenshot_url} alt="Verification screenshot" />
                          </div>
                        )}
                      </div>
                    )}

                    {bug.reported_by_email && (
                      <p className="text-[10px] text-muted-foreground">Reported by: <span className="font-semibold">{bug.reported_by_email}</span></p>
                    )}

                    {/* Verify fix buttons — show on fixed bugs without verification */}
                    {bug.status === 'fixed' && !bug.verified_status && (
                      <VerifyFixForm bug={bug} verifierEmail={currentUserEmail} onUpdate={(updated) => setBugs((prev) => prev.map((b) => b.id === updated.id ? updated : b))} />
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

// Inline verification form for fixed bugs
function VerifyFixForm({ bug, verifierEmail, onUpdate }: { bug: BugRow; verifierEmail: string; onUpdate: (b: BugRow) => void }) {
  const [notes, setNotes] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => setScreenshot(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function submit(verified_status: 'confirmed' | 'not_fixed') {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bug.id,
          verified_status,
          verification_notes: notes.trim() || null,
          verification_screenshot_url: screenshot || null,
          verified_by: verifierEmail,
        }),
      })
      const data = await res.json()
      if (data.bug) onUpdate(data.bug)
    } catch { /* */ }
    setSubmitting(false)
  }

  return (
    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
      <p className="text-xs font-bold">Verify this fix</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional) — describe what you tested"
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-none"
      />
      <div className="flex items-center gap-2">
        {screenshot ? (
          <div className="relative">
            <img src={screenshot} alt="Screenshot" className="h-12 rounded border border-border" />
            <button onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 h-7 px-2 rounded border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground">
            <ImagePlus className="w-3 h-3" /> Screenshot
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="flex-1" />
        <button onClick={() => submit('not_fixed')} disabled={submitting}
          className="flex items-center gap-1 h-7 px-3 rounded-lg border border-red-500/30 text-red-600 text-[11px] font-semibold hover:bg-red-500/10 disabled:opacity-50">
          <XCircle className="w-3 h-3" /> Still Not Fixed
        </button>
        <button onClick={() => submit('confirmed')} disabled={submitting}
          className="flex items-center gap-1 h-7 px-3 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-50">
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Verified
        </button>
      </div>
    </div>
  )
}
