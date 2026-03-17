'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  ArrowRightLeft,
  Handshake,
  Star,
  TrendingUp,
  TrendingDown,
  Mail,
  BarChart3,
  Shield,
} from 'lucide-react'
import { agents } from '@/data/agents'
import { existingRequests } from '@/data/partnerships'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { PLANS, type SubscriptionTier } from '@/lib/stripe'

const TIER_COLORS: Record<SubscriptionTier, string> = {
  starter: 'bg-gray-500',
  growth: 'bg-blue-500',
  pro: 'bg-violet-500',
  elite: 'bg-amber-500',
}

export default function AdminOverview() {
  const { isAdmin, tier, setAdminTier } = useFeatureGate()
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/spots')
      .then((r) => r.json())
      .then((d) => setSpotsLeft(d.remaining))
      .catch(() => setSpotsLeft(4847))
  }, [])

  const stats = [
    { label: 'Total Users', value: 116, icon: Users, trend: '+12%', up: true },
    { label: 'Active Users', value: 89, icon: UserCheck, trend: '+8%', up: true },
    { label: 'Total Referrals', value: 342, icon: ArrowRightLeft, trend: '+15%', up: true },
    { label: 'Active Partnerships', value: 187, icon: Handshake, trend: '+6%', up: true },
    { label: 'Founding Spots Left', value: spotsLeft ?? '...', icon: Star, trend: '-3%', up: false },
  ]

  // Recent signups — use last 10 agents sorted by a mock "joined" date
  const recentSignups = useMemo(() => {
    const now = Date.now()
    return agents.slice(0, 10).map((a, i) => ({
      ...a,
      joined: new Date(now - i * 86400000 * 2).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }))
  }, [])

  // Recent partnerships
  const recentPartnerships = useMemo(() => {
    return existingRequests
      .filter((r) => r.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((r) => {
        const agent1 = agents.find((a) => a.id === r.requestingAgentId)
        const agent2 = agents.find((a) => a.id === r.receivingAgentId)
        return {
          id: r.id,
          agent1: agent1?.name ?? r.requestingAgentId,
          agent2: agent2?.name ?? r.receivingAgentId,
          markets: `${r.requestingMarket} / ${r.receivingMarket}`,
          status: r.status,
          created: new Date(r.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }
      })
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform health at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4 text-muted-foreground" />
              <span
                className={`flex items-center gap-0.5 text-[10px] font-bold ${
                  s.up ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.trend}
              </span>
            </div>
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Recent Signups</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Name</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Email</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden sm:table-cell">Brokerage</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">Market</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((a) => (
                <tr key={a.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-medium">{a.name}</td>
                  <td className="py-2.5 text-muted-foreground">{a.email}</td>
                  <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{a.brokerage}</td>
                  <td className="py-2.5 text-muted-foreground hidden md:table-cell">{a.area}</td>
                  <td className="py-2.5 text-muted-foreground">{a.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Partnerships */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Recent Partnerships</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Agent 1</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Agent 2</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2 hidden md:table-cell">Markets</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Status</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentPartnerships.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-medium">{p.agent1}</td>
                  <td className="py-2.5 font-medium">{p.agent2}</td>
                  <td className="py-2.5 text-muted-foreground hidden md:table-cell text-xs">{p.markets}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{p.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/admin/invites"
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Mail className="w-4 h-4" />
          Send Invites
        </Link>
        <Link
          href="/dashboard/admin/analytics"
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          View Analytics
        </Link>

        {/* Inline Tier Switcher */}
        {isAdmin && (
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-card">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-muted-foreground mr-1">Tier Override:</span>
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setAdminTier(plan.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                  tier === plan.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${TIER_COLORS[plan.id]}`} />
                {plan.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
