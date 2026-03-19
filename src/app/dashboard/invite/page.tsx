'use client'

import { useState, useEffect } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useAppData } from '@/lib/data-provider'
import { useAuth } from '@/contexts/auth-context'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import type { Invite } from '@/data/invites'
import BackToDashboard from '@/components/layout/back-to-dashboard'
import {
  Copy, Check, Send, Link2, Mail, MessageSquare, UserPlus,
  Users, Gift, TrendingUp, Clock, Eye, UserCheck, Sparkles,
  X, Share2, Loader2, MailPlus, Lock
} from 'lucide-react'
import { ReferralCodeEditor } from '@/components/ui/referral-code-editor'

const STATUS_CONFIG: Record<Invite['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Available', color: 'text-muted-foreground', bg: 'bg-secondary', icon: Clock },
  opened: { label: 'Opened', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Eye },
  signed_up: { label: 'Signed Up', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: UserPlus },
  active: { label: 'Active', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: UserCheck },
}

function InviteSkeleton() {
  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-52 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[140px] rounded-xl mb-8" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-lg mb-2" />
        ))}
      </div>
    </div>
  )
}

export default function InvitePage() {
  const demoGuard = useDemoGuard()
  const { invites: initialInvites, referralCode: REFERRAL_CODE_MOCK, referralLink: REFERRAL_LINK_MOCK, invitesLoading } = useAppData()
  const { profile, user } = useAuth()
  // Use real profile referral code, falling back to mock data
  const [customReferralCode, setCustomReferralCode] = useState<string | null>(null)
  const REFERRAL_CODE = customReferralCode || profile?.referral_code || REFERRAL_CODE_MOCK
  const REFERRAL_LINK = REFERRAL_CODE
    ? `https://agentreferrals.ai/invite/${REFERRAL_CODE}`
    : REFERRAL_LINK_MOCK
  const [inviteList, setInviteList] = useState<Invite[]>(initialInvites)

  // Sync when data source changes
  useEffect(() => {
    setInviteList(initialInvites)
  }, [initialInvites])
  const [copied, setCopied] = useState(false)
  const [showBulkInvite, setShowBulkInvite] = useState(false)
  const [showSingleInvite, setShowSingleInvite] = useState(false)
  const [singleForm, setSingleForm] = useState({ name: '', email: '', brokerage: '', market: '' })
  const [bulkEmails, setBulkEmails] = useState('')
  const [sentToast, setSentToast] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const stats = {
    totalSent: inviteList.length,
    opened: inviteList.filter((i) => i.status === 'opened').length,
    signedUp: inviteList.filter((i) => i.status === 'signed_up').length,
    active: inviteList.filter((i) => i.status === 'active').length,
  }
  const conversionRate = stats.totalSent > 0 ? Math.round(((stats.signedUp + stats.active) / stats.totalSent) * 100) : 0

  function copyLink() {
    navigator.clipboard.writeText(REFERRAL_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function callInviteApi(inviteeEmail: string, inviteeName: string, inviteeBrokerage: string, inviteeMarket: string) {
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteeEmail,
        inviteeName: inviteeName || inviteeEmail.split('@')[0],
        inviteeBrokerage: inviteeBrokerage || undefined,
        inviteeMarket: inviteeMarket || undefined,
        inviterId: user?.id,
        inviterName: profile?.full_name,
        inviterBrokerage: profile?.brokerage?.name,
        inviterArea: profile?.primary_area,
        referralCode: profile?.referral_code || REFERRAL_CODE,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send invite')
    return data
  }

  async function sendSingleInvite() {
    if (demoGuard()) return
    if (!singleForm.email) return
    setSendingInvite(true)
    setInviteError('')

    try {
      await callInviteApi(singleForm.email, singleForm.name, singleForm.brokerage, singleForm.market)

      // Add to local list optimistically
      const newInvite: Invite = {
        id: `inv-${Date.now()}`,
        name: singleForm.name || singleForm.email.split('@')[0],
        email: singleForm.email,
        brokerage: singleForm.brokerage || 'Pending',
        market: singleForm.market || 'TBD',
        status: 'pending',
        sentDate: 'Just now',
        method: 'email',
      }
      setInviteList((prev) => [newInvite, ...prev])
      setSingleForm({ name: '', email: '', brokerage: '', market: '' })
      setShowSingleInvite(false)
      setSentToast(`Invite sent to ${newInvite.name}`)
      setTimeout(() => setSentToast(''), 3000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSendingInvite(false)
    }
  }

  async function sendBulkInvite() {
    if (demoGuard()) return
    const emails = bulkEmails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean)
    if (emails.length === 0) return
    setSendingBulk(true)
    setInviteError('')

    let successCount = 0
    let failCount = 0

    for (const email of emails) {
      try {
        await callInviteApi(email, email.split('@')[0], '', '')
        successCount++
      } catch {
        failCount++
      }
    }

    // Add successful ones to local list
    const newInvites: Invite[] = emails.slice(0, successCount).map((email, i) => ({
      id: `inv-bulk-${Date.now()}-${i}`,
      name: email.split('@')[0],
      email,
      brokerage: 'Pending',
      market: 'TBD',
      status: 'pending' as const,
      sentDate: 'Just now',
      method: 'email' as const,
    }))
    setInviteList((prev) => [...newInvites, ...prev])
    setBulkEmails('')
    setShowBulkInvite(false)
    setSendingBulk(false)

    if (failCount > 0) {
      setSentToast(`${successCount} sent, ${failCount} failed`)
    } else {
      setSentToast(`${successCount} invites sent`)
    }
    setTimeout(() => setSentToast(''), 3000)
  }

  if (invitesLoading) return <InviteSkeleton />

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="max-w-5xl mx-auto">
        <BackToDashboard />
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-2xl">Your Invites</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Share your referral link with agents you trust to grow your network.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {[
            { icon: Send, label: 'Invites Sent', value: stats.totalSent, color: 'text-foreground', bg: 'bg-secondary' },
            { icon: Eye, label: 'Opened', value: stats.opened, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { icon: UserPlus, label: 'Signed Up', value: stats.signedUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { icon: UserCheck, label: 'Active', value: stats.active, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { icon: TrendingUp, label: 'Conversion', value: `${conversionRate}%`, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className={`font-extrabold text-2xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referral Link Card */}
        <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">Your Referral Link</span>
              </div>
              <p className="text-xs text-muted-foreground">Share this link with any agent — they&apos;ll be connected to your network when they sign up</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Gift className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Earn 10% of their subscription for 2 years</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 px-4 rounded-lg border border-border bg-card flex items-center text-sm text-muted-foreground truncate">
              {REFERRAL_LINK}
            </div>
            <button
              onClick={copyLink}
              className={`h-10 px-4 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
            </button>
            <button className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors" title="Share">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span>Referral code: <span className="font-semibold text-foreground">{REFERRAL_CODE}</span></span>
            {user?.id && REFERRAL_CODE && (
              <ReferralCodeEditor
                currentCode={REFERRAL_CODE}
                userId={user.id}
                onSaved={(newCode) => setCustomReferralCode(newCode)}
              />
            )}
            <span>&middot;</span>
            <span>{stats.signedUp + stats.active} agents joined via your link</span>
          </div>
        </div>

        {/* Send an Invite Methods */}
        <div className="mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm">Send an Invite</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => setShowSingleInvite(true)}
            className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all text-left group"
          >
            <Mail className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-sm mb-1">Email Invite</div>
            <p className="text-xs text-muted-foreground">Send a personalized email invitation to a specific agent</p>
          </button>
          <button
            onClick={() => setShowBulkInvite(true)}
            className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all text-left group"
          >
            <Users className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-sm mb-1">Bulk Import</div>
            <p className="text-xs text-muted-foreground">Paste a list of emails to invite multiple agents at once</p>
          </button>
          <button
            onClick={copyLink}
            className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all text-left group"
          >
            <Link2 className="w-8 h-8 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-sm mb-1">Share Link</div>
            <p className="text-xs text-muted-foreground">Copy your referral link to share on social, text, or anywhere</p>
          </button>
        </div>

        {/* Invite History */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="font-bold text-sm">Invite History</div>
            <span className="text-xs text-muted-foreground">{inviteList.length} invites</span>
          </div>
          <div className="divide-y divide-border">
            {inviteList.length === 0 && (
              <EmptyState
                icon={MailPlus}
                title="No invites sent yet"
                description="Invite agents to grow your network. When they sign up, they will be connected to you automatically."
                className="py-12"
              />
            )}
            {inviteList.map((invite) => {
              const status = STATUS_CONFIG[invite.status]
              const StatusIcon = status.icon
              return (
                <div key={invite.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-accent/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {invite.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{invite.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{invite.brokerage} &middot; {invite.market}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                    {invite.method === 'email' && <Mail className="w-3 h-3" />}
                    {invite.method === 'link' && <Link2 className="w-3 h-3" />}
                    {invite.method === 'sms' && <MessageSquare className="w-3 h-3" />}
                    {invite.sentDate}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Single Invite Modal */}
      {showSingleInvite && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowSingleInvite(false) }}>
          <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="font-bold text-lg">Send an Invite</div>
              <button onClick={() => setShowSingleInvite(false)} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">They&apos;ll receive an email with your personal invite to join AgentReferrals. When they sign up, they&apos;ll be automatically connected to your network.</p>
              {inviteError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {inviteError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                  <input value={singleForm.name} onChange={(e) => setSingleForm((p) => ({ ...p, name: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email *</label>
                  <input value={singleForm.email} onChange={(e) => setSingleForm((p) => ({ ...p, email: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="jane@brokerage.com" type="email" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Brokerage</label>
                <input value={singleForm.brokerage} onChange={(e) => setSingleForm((p) => ({ ...p, brokerage: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Their brokerage name" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Market / Area</label>
                <input value={singleForm.market} onChange={(e) => setSingleForm((p) => ({ ...p, market: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="City, State" />
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>The invite email includes your name, a link to sign up, and a note that they&apos;ll be connected to your referral network automatically.</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-border">
              <button onClick={() => setShowSingleInvite(false)} className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={sendSingleInvite}
                disabled={sendingInvite || !singleForm.email}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingInvite ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInvite && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowBulkInvite(false) }}>
          <div className="w-full max-w-[520px] rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="font-bold text-lg">Bulk Invite</div>
              <button onClick={() => setShowBulkInvite(false)} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">Paste email addresses below — one per line, or separated by commas. Each agent will receive a personalized invite to join your network.</p>
              {inviteError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {inviteError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Addresses</label>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm resize-none font-mono"
                  placeholder={"jane@compass.com\nmike@remax.com\nsarah@kw.com"}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {bulkEmails.split(/[\n,;]+/).filter((e) => e.trim()).length} email{bulkEmails.split(/[\n,;]+/).filter((e) => e.trim()).length !== 1 ? 's' : ''} detected
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-border">
              <button onClick={() => setShowBulkInvite(false)} className="h-10 px-5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors">Cancel</button>
              <button
                onClick={sendBulkInvite}
                disabled={sendingBulk || bulkEmails.split(/[\n,;]+/).filter((e) => e.trim()).length === 0}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                {sendingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingBulk ? 'Sending...' : 'Send All Invites'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {sentToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> {sentToast}
        </div>
      )}
    </div>
  )
}
