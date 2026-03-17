'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  getVerifiedReferrals,
  getVerifiedCount,
  getPendingCount,
  type VerifiedReferral,
} from '@/data/verified-referrals'
import {
  BadgeCheck,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Send,
  RotateCcw,
  Eye,
  FileCheck,
  Plus,
  DollarSign,
  Loader2,
} from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Status Badge ──
function StatusBadge({ status }: { status: VerifiedReferral['status'] }) {
  const styles = {
    verified: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    disputed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  }
  const icons = {
    verified: <BadgeCheck className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    disputed: <AlertTriangle className="w-3 h-3" />,
  }
  const labels = { verified: 'Verified', pending: 'Pending', disputed: 'Disputed' }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  )
}

// ── Direction Arrow ──
function DirectionArrow({ direction }: { direction: 'sent' | 'received' }) {
  if (direction === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <ArrowUpRight className="w-4 h-4" />
        <span className="text-xs font-medium">Sent</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <ArrowDownLeft className="w-4 h-4" />
      <span className="text-xs font-medium">Received</span>
    </span>
  )
}

// ══════════════════════════════════════
// Main Page
// ══════════════════════════════════════
export default function ReferralHistoryPage() {
  const { profile } = useAuth()
  const agentId = profile?.id || 'jason'

  const referrals = useMemo(() => getVerifiedReferrals(agentId), [agentId])
  const verifiedCount = useMemo(() => getVerifiedCount(agentId), [agentId])
  const pendingCount = useMemo(() => getPendingCount(agentId), [agentId])
  const disputedCount = useMemo(() => referrals.filter((r) => r.status === 'disputed').length, [referrals])

  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Form state
  const [direction, setDirection] = useState<'sent' | 'received'>('sent')
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [market, setMarket] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [referralFee, setReferralFee] = useState('25')
  const [closeDate, setCloseDate] = useState('')

  // Sort referrals by date descending
  const sortedReferrals = useMemo(
    () => [...referrals].sort((a, b) => new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()),
    [referrals]
  )

  const resetForm = () => {
    setDirection('sent')
    setPartnerName('')
    setPartnerEmail('')
    setClientName('')
    setMarket('')
    setSalePrice('')
    setReferralFee('25')
    setCloseDate('')
  }

  const handleSubmit = async () => {
    if (!partnerEmail || !partnerName) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/verified-referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterId: agentId,
          partnerEmail,
          partnerName,
          direction,
          clientName,
          market,
          salePrice: salePrice ? parseFloat(salePrice.replace(/[,$]/g, '')) : null,
          referralFeePercent: parseInt(referralFee, 10) || 25,
          closeDate: closeDate || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccessMessage(`Verification request sent to ${partnerEmail}!`)
        resetForm()
        setShowForm(false)
        setTimeout(() => setSuccessMessage(''), 5000)
      }
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Referral History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add past referrals and get them verified by your partners
          </p>
        </div>

        {/* ── Success Toast ── */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{successMessage}</span>
          </div>
        )}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="p-5 rounded-xl border border-border bg-card text-center">
            <FileCheck className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-extrabold">{referrals.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Submitted</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card text-center">
            <BadgeCheck className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{verifiedCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Verified</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Pending Verification</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card text-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">{disputedCount}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Disputed</div>
          </div>
        </div>

        {/* ── Add Past Referral (Collapsible) ── */}
        <div className="mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Add a Past Referral</div>
                <div className="text-xs text-muted-foreground">Submit a referral and send a verification request to your partner</div>
              </div>
            </div>
            {showForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>

          {showForm && (
            <div className="mt-2 p-5 rounded-xl border border-border bg-card space-y-5">
              {/* Direction Toggle */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Direction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDirection('sent')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      direction === 'sent'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : 'border border-border bg-card hover:bg-accent'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    I sent a referral
                  </button>
                  <button
                    onClick={() => setDirection('received')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      direction === 'received'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'border border-border bg-card hover:bg-accent'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    I received a referral
                  </button>
                </div>
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Partner Name *</label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Ashley Monroe"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Partner Email *</label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@brokerage.com"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Client First Name / Initials</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Martinez Family"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Market</label>
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="e.g. Nashville, TN"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Estimated Sale Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="500,000"
                      className="w-full h-10 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Referral Fee %</label>
                  <input
                    type="number"
                    value={referralFee}
                    onChange={(e) => setReferralFee(e.target.value)}
                    min={1}
                    max={100}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="sm:w-1/2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Close Date</label>
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !partnerEmail || !partnerName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit &amp; Send Verification Request
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Referral History Table ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold">Referral History</h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                  <th className="text-left px-5 py-3">Direction</th>
                  <th className="text-left px-5 py-3">Partner</th>
                  <th className="text-left px-5 py-3">Client</th>
                  <th className="text-left px-5 py-3">Market</th>
                  <th className="text-right px-5 py-3">Sale Price</th>
                  <th className="text-right px-5 py-3">Fee</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedReferrals.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <DirectionArrow direction={r.direction} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium">{r.partnerName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">{r.clientName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">{r.market}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-medium">{formatCurrency(r.salePrice)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm text-muted-foreground">{r.referralFeePercent}%</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">{formatDate(r.closeDate)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === 'pending' && (
                          <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors">
                            <RotateCcw className="w-3 h-3" />
                            Resend
                          </button>
                        )}
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors">
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {sortedReferrals.map((r) => (
              <div key={r.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <DirectionArrow direction={r.direction} />
                  <StatusBadge status={r.status} />
                </div>
                <div>
                  <div className="text-sm font-bold">{r.partnerName}</div>
                  <div className="text-xs text-muted-foreground">{r.clientName} &middot; {r.market}</div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{formatCurrency(r.salePrice)}</span>
                  <span className="text-muted-foreground">{r.referralFeePercent}% &middot; {formatDate(r.closeDate)}</span>
                </div>
                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors">
                      <RotateCcw className="w-3 h-3" />
                      Resend
                    </button>
                  )}
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-card hover:bg-accent transition-colors">
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
