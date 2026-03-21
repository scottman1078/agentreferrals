'use client'

import { useState, useEffect } from 'react'
import { Users, ArrowRightLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [usersThisWeek, setUsersThisWeek] = useState(0)
  const [usersThisMonth, setUsersThisMonth] = useState(0)
  const [referralsThisMonth, setReferralsThisMonth] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [brokerageStats, setBrokerageStats] = useState<{ name: string; count: number; pct: string }[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Users this week (real only)
      const { count: weekCount } = await supabase
        .from('ar_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)
        .gte('created_at', weekAgo)

      setUsersThisWeek(weekCount ?? 0)

      // Users this month (real only)
      const { count: monthCount } = await supabase
        .from('ar_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)
        .gte('created_at', monthAgo)

      setUsersThisMonth(monthCount ?? 0)

      // Total real users
      const { count: total } = await supabase
        .from('ar_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)

      setTotalUsers(total ?? 0)

      // Referrals this month (real only)
      const { count: refCount } = await supabase
        .from('ar_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)
        .gte('created_at', monthAgo)

      setReferralsThisMonth(refCount ?? 0)

      // Brokerage distribution (real users only)
      const { data: profiles } = await supabase
        .from('ar_profiles')
        .select('brokerage:ar_brokerages(name)')
        .eq('is_demo', false)

      const brokerageMap: Record<string, number> = {}
      for (const p of profiles ?? []) {
        const name = (p.brokerage as { name: string } | null)?.name || 'No Brokerage'
        brokerageMap[name] = (brokerageMap[name] || 0) + 1
      }

      const totalProfiles = profiles?.length ?? 1
      const sorted = Object.entries(brokerageMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          pct: `${((count / totalProfiles) * 100).toFixed(1)}%`,
        }))

      setBrokerageStats(sorted)
      setLoading(false)
    }

    load()
  }, [])

  const stats = [
    { label: 'Users this week', value: usersThisWeek, icon: Users },
    { label: 'Users this month', value: usersThisMonth, icon: Users },
    { label: 'Total users', value: totalUsers, icon: Users },
    { label: 'Referrals this month', value: referralsThisMonth, icon: ArrowRightLeft },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform growth and network metrics — real data only</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <s.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="text-2xl font-extrabold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : s.value}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Brokerage Distribution */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Brokerage Distribution</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : brokerageStats.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No data yet.</p>
        ) : (
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
                {brokerageStats.map((b) => (
                  <tr key={b.name} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 font-medium">{b.name}</td>
                    <td className="py-2.5 text-muted-foreground">{b.count}</td>
                    <td className="py-2.5 text-muted-foreground">{b.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
