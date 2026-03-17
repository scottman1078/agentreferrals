'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, ArrowRightLeft, Handshake } from 'lucide-react'
import { agents } from '@/data/agents'

export default function AdminAnalyticsPage() {
  // Growth metrics (mock)
  const growthMetrics = [
    { label: 'Users this week', value: 12, icon: Users },
    { label: 'Users this month', value: 47, icon: Users },
    { label: 'Referrals this month', value: 23, icon: ArrowRightLeft },
    { label: 'Partnerships this month', value: 15, icon: Handshake },
  ]

  // Top Markets
  const topMarkets = useMemo(() => {
    const marketMap: Record<string, { count: number; referrals: number; totalScore: number }> = {}
    agents.forEach((a) => {
      // Extract a readable market from the area
      const market = a.area.split(',')[0].trim()
      if (!marketMap[market]) {
        marketMap[market] = { count: 0, referrals: 0, totalScore: 0 }
      }
      marketMap[market].count++
      marketMap[market].referrals += a.closedReferrals ?? 0
      marketMap[market].totalScore += a.referNetScore ?? 0
    })

    return Object.entries(marketMap)
      .map(([market, data]) => ({
        market,
        agentCount: data.count,
        referrals: data.referrals,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.agentCount - a.agentCount)
      .slice(0, 10)
  }, [])

  // Brokerage Distribution
  const brokerageDistribution = useMemo(() => {
    const brokerageMap: Record<string, number> = {}
    agents.forEach((a) => {
      const brokerage = a.brokerage
      brokerageMap[brokerage] = (brokerageMap[brokerage] || 0) + 1
    })

    const total = agents.length
    return Object.entries(brokerageMap)
      .map(([brokerage, count]) => ({
        brokerage,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
  }, [])

  // Tier Distribution
  const tierDistribution = useMemo(() => {
    const tiers: Record<string, number> = { starter: 0, growth: 0, pro: 0, elite: 0 }
    agents.forEach((a) => {
      const score = a.referNetScore ?? 0
      if (score >= 93) tiers.elite++
      else if (score >= 88) tiers.pro++
      else if (score >= 82) tiers.growth++
      else tiers.starter++
    })
    const total = agents.length
    return Object.entries(tiers).map(([tier, count]) => ({
      tier,
      count,
      pct: ((count / total) * 100).toFixed(1),
    }))
  }, [])

  const tierColors: Record<string, string> = {
    starter: 'bg-gray-500',
    growth: 'bg-blue-500',
    pro: 'bg-violet-500',
    elite: 'bg-amber-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform growth and network metrics</p>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {growthMetrics.map((m) => (
          <div key={m.label} className="p-5 rounded-xl border border-border bg-card">
            <m.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="text-2xl font-extrabold">{m.value}</div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Top Markets */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Top Markets</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Market</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Agent Count</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Referrals</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Avg ReferNet</th>
              </tr>
            </thead>
            <tbody>
              {topMarkets.map((m) => (
                <tr key={m.market} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-medium">{m.market}</td>
                  <td className="py-2.5 text-muted-foreground">{m.agentCount}</td>
                  <td className="py-2.5 text-muted-foreground">{m.referrals}</td>
                  <td className="py-2.5 font-semibold">{m.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brokerage Distribution */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Brokerage Distribution</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Brokerage</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">Agent Count</th>
                <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left pb-2">% of Network</th>
              </tr>
            </thead>
            <tbody>
              {brokerageDistribution.map((b) => (
                <tr key={b.brokerage} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 font-medium">{b.brokerage}</td>
                  <td className="py-2.5 text-muted-foreground">{b.count}</td>
                  <td className="py-2.5 text-muted-foreground">{b.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-4">Tier Distribution</h2>
        <div className="space-y-3">
          {tierDistribution.map((t) => (
            <div key={t.tier} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">{t.tier}</span>
                <span className="text-xs text-muted-foreground">{t.count} agents ({t.pct}%)</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${tierColors[t.tier]} transition-all duration-500`}
                  style={{ width: `${t.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
