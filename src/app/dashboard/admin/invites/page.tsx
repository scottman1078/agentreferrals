'use client'

import { useState, useEffect } from 'react'
import { Mail, CheckCircle, Clock, Users, DollarSign, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

interface Invite {
  id: string
  referral_code: string | null
  invitee_name: string | null
  invitee_email: string | null
  status: string
  created_at: string
  signed_up_at: string | null
  signed_up_user_id: string | null
  invited_by: string | null
  inviter_name: string
}

interface InviteStats {
  totalSent: number
  signedUp: number
  conversionRate: string
  pending: number
  totalGenerated: number
}

interface RewardStats {
  totalEarned: number
  totalPaid: number
  count: number
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  signed_up: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [stats, setStats] = useState<InviteStats | null>(null)
  const [rewards, setRewards] = useState<RewardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'signed_up' | 'active'>('all')

  function loadData() {
    setLoading(true)
    fetch('/api/admin/invites')
      .then((r) => r.json())
      .then((data) => {
        setInvites(data.invites || [])
        setStats(data.stats || null)
        setRewards(data.rewards || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter invites for display — hide placeholder invites unless showing all
  const displayInvites = invites.filter((inv) => {
    const isPlaceholder = inv.invitee_email?.startsWith('placeholder-')
    if (filter === 'all') return !isPlaceholder
    if (filter === 'pending') return inv.status === 'pending' && !isPlaceholder
    return inv.status === filter
  })

  const statCards = [
    {
      label: 'Total Invites Sent',
      value: stats?.totalSent ?? 0,
      icon: Mail,
      color: 'text-blue-500',
    },
    {
      label: 'Signed Up',
      value: stats?.signedUp ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-500',
    },
    {
      label: 'Conversion Rate',
      value: `${stats?.conversionRate ?? '0.0'}%`,
      icon: TrendingUp,
      color: 'text-violet-500',
    },
    {
      label: 'Pending',
      value: stats?.pending ?? 0,
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      label: 'Codes Generated',
      value: stats?.totalGenerated ?? 0,
      icon: Users,
      color: 'text-cyan-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Invites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track invitations and affiliate rewards across all users
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading invite data...
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
                <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
                <div className="text-2xl font-extrabold">{s.value}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Affiliate Rewards Summary */}
          {rewards && (rewards.totalEarned > 0 || rewards.count > 0) && (
            <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold">Affiliate Rewards</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-lg font-extrabold">
                    ${rewards.totalEarned.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Total Earned
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold">
                    ${rewards.totalPaid.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Total Paid Out
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold">
                    ${(rewards.totalEarned - rewards.totalPaid).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Outstanding
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'signed_up', 'active'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {f === 'all'
                  ? 'All Sent'
                  : f === 'signed_up'
                    ? 'Signed Up'
                    : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Invites Table */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <h2 className="text-sm font-bold mb-3">
              Recent Invites ({displayInvites.length})
            </h2>
            {displayInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No invites found for this filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        Inviter
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        Invitee Email
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">
                        Code
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        Status
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">
                        Sent
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden lg:table-cell">
                        Signed Up
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayInvites.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 font-medium">
                          {inv.inviter_name}
                        </td>
                        <td className="py-2.5 text-muted-foreground max-w-[200px] truncate">
                          {inv.invitee_email}
                        </td>
                        <td className="py-2.5 text-muted-foreground font-mono text-xs hidden md:table-cell">
                          {inv.referral_code || '—'}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              STATUS_STYLES[inv.status] || STATUS_STYLES.pending
                            }`}
                          >
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                          {inv.created_at
                            ? new Date(inv.created_at).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric', year: 'numeric' }
                              )
                            : '—'}
                        </td>
                        <td className="py-2.5 text-muted-foreground hidden lg:table-cell">
                          {inv.signed_up_at
                            ? new Date(inv.signed_up_at).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric', year: 'numeric' }
                              )
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
