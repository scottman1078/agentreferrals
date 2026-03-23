'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useSpecializations } from '@/hooks/use-specializations'
import { X, Send, Loader2, Check } from 'lucide-react'

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const { names: ALL_TAGS, colorMap: TAG_COLORS } = useSpecializations()
  const { profile, user } = useAuth()
  const demoGuard = useDemoGuard()

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [brokerage, setBrokerage] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const toggleTag = (tag: string) => setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  async function handleSend() {
    if (demoGuard()) return
    if (!email) {
      setError('Email is required')
      return
    }
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeEmail: email,
          inviteeName: fullName || email.split('@')[0],
          inviteeBrokerage: brokerage || undefined,
          inviteeMarket: serviceArea || undefined,
          personalMessage: note || undefined,
          inviterId: user?.id,
          inviterName: profile?.full_name,
          inviterBrokerage: profile?.brokerage?.name,
          inviterArea: profile?.primary_area,
          referralCode: profile?.referral_code,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invite')

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="font-bold text-lg">Invite Agent</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" /> Invite sent successfully!
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="First" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Last" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email *</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="agent@brokerage.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Brokerage</label>
            <input value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Brokerage name" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Service Area</label>
            <input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="City / County" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Specializations</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${selectedTags.includes(tag) ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:text-foreground'}`} style={selectedTags.includes(tag) ? { background: TAG_COLORS[tag] } : {}}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" placeholder="Personal message..." />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border">
          <button onClick={onClose} className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || !email || success}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : success ? 'Sent!' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  )
}
