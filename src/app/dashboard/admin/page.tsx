'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  ArrowRightLeft,
  Star,
  Mail,
  BarChart3,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProfileRow {
  id: string
  full_name: string
  email: string
  primary_area: string | null
  created_at: string
  is_demo: boolean
  brokerage: { name: string } | null
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)
  const [totalReferrals, setTotalReferrals] = useState(0)
  const [recentSignups, setRecentSignups] = useState<ProfileRow[]>([])
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null)
  const [signupsOpen, setSignupsOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function loadData() {
      // Founding spots
      fetch('/api/spots')
        .then((r) => r.json())
        .then((d) => setSpotsLeft(d.remaining))
        .catch(() => setSpotsLeft(null))

      // Real users (not demo)
      const { count: userCount } = await supabase
        .from('ar_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)

      setTotalUsers(userCount ?? 0)

      // Active = has setup_completed_at
      const { count: activeCount } = await supabase
        .from('ar_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)
        .not('setup_completed_at', 'is', null)

      setActiveUsers(activeCount ?? 0)

      // Real referrals
      const { count: refCount } = await supabase
        .from('ar_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('is_demo', false)

      setTotalReferrals(refCount ?? 0)

      // Recent signups (real users, last 10)
      const { data: signups } = await supabase
        .from('ar_profiles')
        .select('id, full_name, email, primary_area, created_at, is_demo, brokerage:ar_brokerages(name)')
        .eq('is_demo', false)
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentSignups((signups as unknown as ProfileRow[]) ?? [])
      setLoading(false)
    }

    loadData()
  }, [])

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users },
    { label: 'Active Users', value: activeUsers, icon: UserCheck },
    { label: 'Total Referrals', value: totalReferrals, icon: ArrowRightLeft },
    { label: 'Founding Spots Left', value: spotsLeft ?? '...', icon: Star },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform health at a glance — real data only (demo agents excluded)</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-extrabold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : s.value}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <h2 className="text-sm font-bold mb-3">Recent Signups</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : recentSignups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No real users yet.</p>
        ) : (
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
                    <td className="py-2.5 font-medium">{a.full_name || '—'}</td>
                    <td className="py-2.5 text-muted-foreground">{a.email}</td>
                    <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{a.brokerage?.name || '—'}</td>
                    <td className="py-2.5 text-muted-foreground hidden md:table-cell">{a.primary_area || '—'}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <Link
          href="/dashboard/admin/users"
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
        >
          <Users className="w-4 h-4" />
          Manage Users
        </Link>
      </div>
    </div>
  )
}
