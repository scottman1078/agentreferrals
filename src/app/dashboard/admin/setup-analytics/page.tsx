'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  RefreshCw,
  Users,
  CheckCircle,
  TrendingDown,
  MapPin,
  Clock,
  AlertTriangle,
} from 'lucide-react'

interface FunnelStep {
  step: string
  count: number
  dropOff: string
}

interface ModeStats {
  mode: string
  count: number
}

interface RecentCompletion {
  id: string
  name: string
  email: string
  completedAt: string
  timeToComplete: string
}

interface StuckUser {
  id: string
  name: string
  email: string
  step: string
  lastActivity: string
}

interface SetupAnalyticsData {
  funnel: {
    totalStarted: number
    completedCount: number
    completionRate: string
    stepCounts: Record<string, number>
    funnelSteps: FunnelStep[]
  }
  territory: {
    modeStats: ModeStats[]
    avgZipsPerUser: string
    totalZipCount: number
    usersWithZips: number
  }
  recentCompletions: RecentCompletion[]
  stuckUsers: StuckUser[]
}

const STEP_LABELS: Record<string, string> = {
  null_step: 'Not Started',
  intake: 'Intake',
  profile: 'Profile',
  service_area: 'Service Area',
  invites: 'Invites',
  complete: 'Complete',
}

const MODE_LABELS: Record<string, string> = {
  city: 'City',
  county: 'County',
  zip: 'ZIP Code',
  radius: 'Radius',
}

export default function SetupAnalyticsPage() {
  const [data, setData] = useState<SetupAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  function loadData() {
    setLoading(true)
    fetch('/api/admin/setup-analytics')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Setup Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            How users progress through the onboarding setup wizard
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
          Loading setup analytics...
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground py-8">Failed to load data.</p>
      ) : (
        <>
          {/* ── Top-level stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-5 rounded-xl border border-border bg-card">
              <Users className="w-4 h-4 text-blue-500 mb-2" />
              <div className="text-2xl font-extrabold">{data.funnel.totalStarted}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Total Users
              </div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <CheckCircle className="w-4 h-4 text-emerald-500 mb-2" />
              <div className="text-2xl font-extrabold">{data.funnel.completedCount}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Completed Setup
              </div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <TrendingDown className="w-4 h-4 text-violet-500 mb-2" />
              <div className="text-2xl font-extrabold">{data.funnel.completionRate}%</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Completion Rate
              </div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <MapPin className="w-4 h-4 text-amber-500 mb-2" />
              <div className="text-2xl font-extrabold">{data.territory.avgZipsPerUser}</div>
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Avg ZIPs / User
              </div>
            </div>
          </div>

          {/* ── Setup Funnel ── */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <h2 className="text-sm font-bold mb-4">Setup Funnel</h2>
            <div className="space-y-2">
              {data.funnel.funnelSteps.map((step, idx) => {
                const maxCount = data.funnel.totalStarted || 1
                const pct = ((step.count / maxCount) * 100).toFixed(0)
                return (
                  <div key={step.step} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-muted-foreground shrink-0 text-right">
                      {STEP_LABELS[step.step] || step.step}
                    </div>
                    <div className="flex-1 h-7 bg-accent/50 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-primary/20 rounded-lg transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-semibold">
                          {step.count} users ({pct}%)
                        </span>
                      </div>
                    </div>
                    {idx > 0 && (
                      <div className="w-20 text-xs text-muted-foreground shrink-0">
                        <span className="text-red-500 font-semibold">{step.dropOff}%</span> drop
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Step distribution breakdown */}
            <div className="mt-5 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Current Step Distribution
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(data.funnel.stepCounts).map(([step, count]) => (
                  <div key={step} className="text-center p-2.5 rounded-lg bg-accent/30">
                    <div className="text-lg font-extrabold">{count}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {STEP_LABELS[step] || step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Territory Mode Popularity ── */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <h2 className="text-sm font-bold mb-3">Territory Mode Popularity</h2>
            {data.territory.modeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No territory data yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.territory.modeStats.map((m) => (
                  <div key={m.mode} className="text-center p-4 rounded-lg bg-accent/30">
                    <div className="text-2xl font-extrabold">{m.count}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-0.5">
                      {MODE_LABELS[m.mode] || m.mode}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              {data.territory.usersWithZips} users have set ZIP codes ({data.territory.totalZipCount} total ZIPs)
            </div>
          </div>

          {/* ── Recent Completions Table ── */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold">Recent Completions ({data.recentCompletions.length})</h2>
            </div>
            {data.recentCompletions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No completed setups yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        User
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">
                        Email
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        Completed
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        Time to Complete
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentCompletions.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-medium">{user.name}</td>
                        <td className="py-2.5 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                          {user.email}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {new Date(user.completedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="font-semibold">{user.timeToComplete}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Stuck Users Table ── */}
          <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold">Stuck in Setup ({data.stuckUsers.length})</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Users who haven&apos;t completed setup and had no activity for 24+ hours
            </p>
            {data.stuckUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No stuck users right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        User
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">
                        Email
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">
                        Stuck At
                      </th>
                      <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stuckUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-medium">{user.name}</td>
                        <td className="py-2.5 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                          {user.email}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            {STEP_LABELS[user.step] || user.step}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground hidden md:table-cell">
                          {new Date(user.lastActivity).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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
