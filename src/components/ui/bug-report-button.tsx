'use client'

import { useState, useEffect, useRef } from 'react'
import { Bug, X, Send, Loader2, ImagePlus, Lightbulb } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePathname } from 'next/navigation'

export default function BugReportButton() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [isFeatureRequest, setIsFeatureRequest] = useState(false)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()

  let profile: { id?: string; email?: string } | null = null
  try {
    const auth = useAuth()
    profile = auth.profile
  } catch { /* not in auth provider */ }

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const val = d.settings?.bug_report_enabled?.value
        if (val === false) setEnabled(false)
      })
      .catch(() => {})
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return // 5MB limit
    const reader = new FileReader()
    reader.onload = () => setScreenshotPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

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
          severity: isFeatureRequest ? 'medium' : severity,
          category: isFeatureRequest ? 'feature' : 'bug',
          reported_by: profile?.id || null,
          reported_by_email: profile?.email || null,
          page_url: pathname,
          screenshot_url: screenshotPreview || null,
        }),
      })
      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setTitle('')
        setDescription('')
        setSeverity('medium')
        setIsFeatureRequest(false)
        setScreenshotPreview(null)
      }, 2000)
    } catch { /* */ }
    setSubmitting(false)
  }

  if (pathname?.startsWith('/dashboard/admin')) return null
  if (!enabled) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[120px] right-[26px] z-[800] w-10 h-10 rounded-full bg-card border border-border text-foreground shadow-lg hover:bg-accent transition-all flex items-center justify-center"
        title="Report a Bug or Request a Feature"
      >
        <Bug className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                {isFeatureRequest ? <Lightbulb className="w-4 h-4 text-teal" /> : <Bug className="w-4 h-4 text-primary" />}
                <h2 className="font-bold text-sm">{isFeatureRequest ? 'Request a Feature' : 'Report a Bug'}</h2>
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
                <p className="font-bold text-sm">Thanks!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isFeatureRequest ? "We'll consider your suggestion." : "We'll look into it."}
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {/* Bug / Feature toggle */}
                <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border">
                  <button
                    onClick={() => setIsFeatureRequest(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      !isFeatureRequest ? 'bg-card border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Bug className="w-3 h-3" /> Bug Report
                  </button>
                  <button
                    onClick={() => setIsFeatureRequest(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isFeatureRequest ? 'bg-card border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Lightbulb className="w-3 h-3" /> Feature Request
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    {isFeatureRequest ? 'What would you like to see?' : "What's wrong?"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isFeatureRequest ? 'Brief description of the feature' : 'Brief description of the issue'}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Details (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isFeatureRequest ? 'Describe the feature and why it would be useful...' : 'Steps to reproduce, what you expected, etc.'}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
                  />
                </div>

                {/* Severity - only for bugs */}
                {!isFeatureRequest && (
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
                )}

                {/* Screenshot upload */}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Screenshot (optional)</label>
                  {screenshotPreview ? (
                    <div className="relative">
                      <img src={screenshotPreview} alt="Screenshot" className="w-full rounded-lg border border-border max-h-40 object-cover" />
                      <button
                        onClick={() => { setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Upload screenshot
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Page: <span className="font-mono">{pathname}</span>
                  {profile?.email && <> · {profile.email}</>}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim()}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : isFeatureRequest ? 'Submit Feature Request' : 'Submit Bug Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
