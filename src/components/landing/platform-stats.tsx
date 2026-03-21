'use client'

import { useState, useEffect } from 'react'

export default function PlatformStats() {
  const [activeAgents, setActiveAgents] = useState<number | null>(null)
  const [avgRcs, setAvgRcs] = useState<number | null>(null)
  const [avgResponseTime, setAvgResponseTime] = useState('< 1hr')

  useEffect(() => {
    fetch('/api/platform-stats')
      .then((r) => r.json())
      .then((d) => {
        setActiveAgents(d.activeAgents)
        setAvgRcs(d.avgRcs)
        setAvgResponseTime(d.avgResponseTime)
      })
      .catch(() => {})
  }, [])

  const stats = [
    { value: activeAgents !== null ? activeAgents.toLocaleString() : '—', label: 'Active Agents', desc: 'Verified agents across all brokerages nationwide' },
    { value: avgRcs !== null ? `${avgRcs}/100` : '—', label: 'Avg Referral Communication Score', desc: 'Every agent is scored on communication, response time, and closed referrals' },
    { value: avgResponseTime, label: 'Avg Response Time', desc: 'Partners who communicate and close deals' },
    { value: '25%', label: 'Referral Fee Standard', desc: 'Transparent agreements with e-signature' },
  ]

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="p-6 rounded-xl border border-border bg-card text-center">
          <div className="font-extrabold text-3xl text-primary mb-1">{stat.value}</div>
          <div className="font-bold text-sm mb-2">{stat.label}</div>
          <p className="text-xs text-muted-foreground">{stat.desc}</p>
        </div>
      ))}
    </div>
  )
}
