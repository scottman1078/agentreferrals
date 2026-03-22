'use client'

import { useState } from 'react'
import { Bug, X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePathname } from 'next/navigation'

export default function BugReportButton() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const pathname = usePathname()

  let profile: { id?: string; email?: string } | null = null
  try {
    const auth = useAuth()
    profile = auth.profile
  } catch { /* not in auth provider */ }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/admin/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          severity,
          category: 'bug',
          reported_by: profile?.id || null,
          reported_by_email: profile?.email || null,
          page_url: pathname,
        }),
      })
      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setTitle('')
        setDescription('')
        setSeverity('medium')
      }, 2000)
    } catch { /* */ }
    setSubmitting(false)
  }

  // Don't show on admin pages (they have their own tracker)
  if (pathname?.startsWith('/dashboard/admin')) return null

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[800] w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all flex items-center justify-center group"
        title="Report a Bug"
      >
        <Bug className="w-4 h-4" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-sm">Report a Bug</h2>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center border border-border hover:bg-accent transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <Send className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="font-bold text-sm">Thanks for the report!</p>
                <p className="text-xs text-muted-foreground mt-1">We&apos;ll look into it.</p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">What&apos;s wrong?</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Details (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Steps to reproduce, what you expected, etc."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">How bad is it?</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          severity === s
                            ? s === 'critical' ? 'bg-red-500/20 text-red-600 border-red-500/30'
                            : s === 'high' ? 'bg-orange-500/20 text-orange-600 border-orange-500/30'
                            : s === 'medium' ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-600 border-blue-500/30'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Page: <span className="font-mono">{pathname}</span>
                  {profile?.email && <> · Reported by: {profile.email}</>}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim()}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Bug Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
