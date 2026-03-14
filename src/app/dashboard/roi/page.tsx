'use client'

import { useEffect, useRef } from 'react'
import { referrals } from '@/data/referrals'
import { agents } from '@/data/agents'
import { formatCurrency, formatFullCurrency } from '@/lib/utils'

export default function ROIPage() {
  const chartRef = useRef<HTMLCanvasElement>(null)

  const closedRefs = referrals.filter((r) => r.stage === 'Fee Received' || r.stage === 'Closed - Fee Pending')
  const totalFees = closedRefs.reduce((s, r) => s + r.estimatedPrice * (r.feePercent / 100), 0)
  const totalVolume = referrals.reduce((s, r) => s + r.estimatedPrice, 0)
  const avgFee = closedRefs.length ? totalFees / closedRefs.length : 0
  const conversionRate = Math.round((closedRefs.length / referrals.length) * 100)

  const stats = [
    { icon: '💰', label: 'Total Referral Fees', value: formatFullCurrency(Math.round(totalFees)), color: 'var(--green)', iconBg: 'rgba(34,197,94,0.15)' },
    { icon: '📊', label: 'Pipeline Volume', value: formatCurrency(totalVolume), color: 'var(--accent)', iconBg: 'var(--accent-bg)' },
    { icon: '🤝', label: 'Active Referrals', value: String(referrals.length), color: 'var(--blue)', iconBg: 'rgba(59,130,246,0.15)' },
    { icon: '✅', label: 'Conversion Rate', value: `${conversionRate}%`, color: 'var(--purple)', iconBg: 'rgba(168,85,247,0.15)' },
  ]

  // Top markets
  const marketCounts: Record<string, { count: number; volume: number }> = {}
  referrals.forEach((r) => {
    if (!marketCounts[r.market]) marketCounts[r.market] = { count: 0, volume: 0 }
    marketCounts[r.market].count++
    marketCounts[r.market].volume += r.estimatedPrice
  })
  const topMarkets = Object.entries(marketCounts).sort((a, b) => b[1].volume - a[1].volume).slice(0, 6)

  // Top agents
  const agentCounts: Record<string, { closed: number; fees: number }> = {}
  closedRefs.forEach((r) => {
    ;[r.fromAgent, r.toAgent].forEach((name) => {
      if (!agentCounts[name]) agentCounts[name] = { closed: 0, fees: 0 }
      agentCounts[name].closed++
      agentCounts[name].fees += r.estimatedPrice * (r.feePercent / 100) / 2
    })
  })
  const topAgents = Object.entries(agentCounts).sort((a, b) => b[1].fees - a[1].fees).slice(0, 5)
  const agentAreas: Record<string, string> = {}
  agents.forEach((a) => { agentAreas[a.name] = a.area })

  useEffect(() => {
    if (!chartRef.current) return
    let chartInstance: import('chart.js').Chart | null = null

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)
      const ctx = chartRef.current?.getContext('2d')
      if (!ctx) return

      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Referral Fees',
            data: [8200, 24500, 12800, 31000, 18500, 9200],
            backgroundColor: 'rgba(240, 165, 0, 0.6)',
            borderColor: '#f0a500',
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(42,49,71,0.5)' }, ticks: { color: '#8892a4' } },
            y: {
              grid: { color: 'rgba(42,49,71,0.5)' },
              ticks: { color: '#8892a4', callback: (v) => `$${Number(v) / 1000}k` },
            },
          },
        },
      })
    })

    return () => { chartInstance?.destroy() }
  }, [])

  return (
    <div className="overflow-y-auto h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="font-[family-name:var(--font-d)] font-bold text-xl">ROI Dashboard</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>YTD · January – March 2025</div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-md flex items-center justify-center text-base mb-3" style={{ background: s.iconBg }}>{s.icon}</div>
            <div className="font-[family-name:var(--font-d)] font-extrabold text-[26px] leading-none mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="p-5 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
          <div className="font-[family-name:var(--font-d)] font-bold text-sm mb-4">Referral Fees by Month</div>
          <div className="h-[160px]">
            <canvas ref={chartRef} />
          </div>
        </div>

        <div className="p-5 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
          <div className="font-[family-name:var(--font-d)] font-bold text-sm mb-4">Top Markets by Referral Volume</div>
          {topMarkets.map(([market, data]) => (
            <div key={market} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-[13px] font-medium">{market}</div>
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="font-[family-name:var(--font-d)] font-bold text-[13px]">{data.count}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Referrals</div>
                </div>
                <div className="text-right">
                  <div className="font-[family-name:var(--font-d)] font-bold text-[13px]">{formatCurrency(data.volume)}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Volume</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top agents */}
      <div className="p-5 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
        <div className="font-[family-name:var(--font-d)] font-bold text-sm mb-4">Top Network Agents by Closed Referrals</div>
        {topAgents.map(([name, data], i) => (
          <div key={name} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-[family-name:var(--font-d)] shrink-0"
              style={{
                background: i === 0 ? 'rgba(240,165,0,0.2)' : 'var(--surf3)',
                color: i === 0 ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold">{name}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{agentAreas[name] || ''}</div>
            </div>
            <div className="font-[family-name:var(--font-d)] font-bold text-sm" style={{ color: 'var(--green)' }}>
              {formatCurrency(Math.round(data.fees))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
