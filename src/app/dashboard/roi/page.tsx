'use client'

import { useEffect, useRef } from 'react'
import { FeatureGate } from '@/components/ui/feature-gate'
import { useAppData } from '@/lib/data-provider'
import { formatCurrency, formatFullCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import BackToDashboard from '@/components/layout/back-to-dashboard'
import { DollarSign, BarChart3, Handshake, Target, PieChart } from 'lucide-react'

function ROISkeleton() {
  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
      <Skeleton className="h-[200px] rounded-xl" />
    </div>
  )
}

export default function ROIPageGated() {
  return (
    <FeatureGate feature="roiAnalytics">
      <ROIPage />
    </FeatureGate>
  )
}

function ROIPage() {
  const { referrals, agents, referralsLoading } = useAppData()
  const chartRef = useRef<HTMLCanvasElement>(null)

  const closedRefs = referrals.filter((r) => r.stage === 'Fee Received' || r.stage === 'Closed - Fee Pending')
  const totalFees = closedRefs.reduce((s, r) => s + r.estimatedPrice * (r.feePercent / 100), 0)
  const totalVolume = referrals.reduce((s, r) => s + r.estimatedPrice, 0)
  const conversionRate = Math.round((closedRefs.length / referrals.length) * 100)

  const stats = [
    { icon: DollarSign, label: 'Total Referral Fees', value: formatFullCurrency(Math.round(totalFees)), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: BarChart3, label: 'Pipeline Volume', value: formatCurrency(totalVolume), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Handshake, label: 'Active Referrals', value: String(referrals.length), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Target, label: 'Conversion Rate', value: `${conversionRate}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  const marketCounts: Record<string, { count: number; volume: number }> = {}
  referrals.forEach((r) => {
    if (!marketCounts[r.market]) marketCounts[r.market] = { count: 0, volume: 0 }
    marketCounts[r.market].count++; marketCounts[r.market].volume += r.estimatedPrice
  })
  const topMarkets = Object.entries(marketCounts).sort((a, b) => b[1].volume - a[1].volume).slice(0, 6)

  const agentCounts: Record<string, { closed: number; fees: number }> = {}
  closedRefs.forEach((r) => {
    ;[r.fromAgent, r.toAgent].forEach((name) => {
      if (!agentCounts[name]) agentCounts[name] = { closed: 0, fees: 0 }
      agentCounts[name].closed++; agentCounts[name].fees += r.estimatedPrice * (r.feePercent / 100) / 2
    })
  })
  const topAgents = Object.entries(agentCounts).sort((a, b) => b[1].fees - a[1].fees).slice(0, 5)
  const agentAreas: Record<string, string> = {}
  agents.forEach((a) => { agentAreas[a.name] = a.area })

  useEffect(() => {
    if (!chartRef.current) return
    let inst: import('chart.js').Chart | null = null
    let cancelled = false
    import('chart.js').then(({ Chart, registerables }) => {
      if (cancelled) return
      Chart.register(...registerables)
      const canvas = chartRef.current
      if (!canvas) return
      // Destroy any existing chart on this canvas
      const existingChart = Chart.getChart(canvas)
      if (existingChart) existingChart.destroy()
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const isDark = document.documentElement.classList.contains('dark')
      inst = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{ label: 'Fees', data: [8200, 24500, 12800, 31000, 18500, 9200], backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark ? '#8892a4' : '#9ca3af' } },
            y: { grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark ? '#8892a4' : '#9ca3af', callback: (v) => `$${Number(v) / 1000}k` } },
          },
        },
      })
    })
    return () => { cancelled = true; inst?.destroy() }
  }, [])

  if (referralsLoading) return <ROISkeleton />

  if (referrals.length === 0) {
    return (
      <div className="overflow-y-auto h-full p-6">
        <BackToDashboard />
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-bold text-xl">ROI Dashboard</h1>
        </div>
        <EmptyState
          icon={PieChart}
          title="No data yet"
          description="Your ROI dashboard will populate as referrals close. Start sending referrals to track your return on investment."
        />
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full p-6">
      <BackToDashboard />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-xl">ROI Dashboard</h1>
        <div className="text-xs text-muted-foreground">YTD · January – March 2025</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-xl border border-border bg-card">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`font-extrabold text-2xl leading-none mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="font-bold text-sm mb-4">Referral Fees by Month</div>
          <div className="h-[160px]"><canvas ref={chartRef} /></div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card">
          <div className="font-bold text-sm mb-4">Top Markets</div>
          {topMarkets.map(([market, data]) => (
            <div key={market} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="text-sm font-medium">{market}</div>
              <div className="flex gap-4">
                <div className="text-right"><div className="font-bold text-xs">{data.count}</div><div className="text-[9px] text-muted-foreground">Referrals</div></div>
                <div className="text-right"><div className="font-bold text-xs">{formatCurrency(data.volume)}</div><div className="text-[9px] text-muted-foreground">Volume</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-xl border border-border bg-card">
        <div className="font-bold text-sm mb-4">Top Agents by Closed Referrals</div>
        {topAgents.map(([name, data], i) => (
          <div key={name} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${i === 0 ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</div>
            <div className="flex-1"><div className="text-sm font-semibold">{name}</div><div className="text-[11px] text-muted-foreground">{agentAreas[name] || ''}</div></div>
            <div className="font-bold text-sm text-emerald-500">{formatCurrency(Math.round(data.fees))}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
