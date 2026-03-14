'use client'

import { useState } from 'react'
import { coverageGaps } from '@/data/coverage-gaps'
import { agents } from '@/data/agents'
import { referrals } from '@/data/referrals'
import { TAG_COLORS, ALL_TAGS } from '@/lib/constants'
import { Check, AlertTriangle, TrendingUp } from 'lucide-react'

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<'gaps' | 'stats'>('gaps')
  const [gaps, setGaps] = useState(coverageGaps)

  const toggleGap = (id: string) => {
    setGaps((prev) => prev.map((g) => (g.id === id ? { ...g, checked: !g.checked } : g)))
  }

  const activeAgents = agents.filter((a) => a.status === 'active')
  const totalDeals = activeAgents.reduce((s, a) => s + a.dealsPerYear, 0)
  const closedReferrals = referrals.filter((r) => r.stage === 'Fee Received' || r.stage === 'Closed - Fee Pending')
  const totalFees = closedReferrals.reduce((s, r) => s + r.estimatedPrice * (r.feePercent / 100), 0)

  const specCounts: Record<string, number> = {}
  agents.forEach((a) => a.tags.forEach((t) => { specCounts[t] = (specCounts[t] || 0) + 1 }))

  return (
    <div className="w-[300px] min-w-[300px] hidden lg:flex flex-col overflow-hidden border-l border-border bg-card">
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {(['gaps', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'gaps' ? 'Coverage Gaps' : 'Network Stats'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'gaps' ? (
          <div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { count: gaps.filter((g) => g.priority === 'High' && !g.checked).length, label: 'High', color: 'text-destructive' },
                { count: gaps.filter((g) => g.priority === 'Medium' && !g.checked).length, label: 'Med', color: 'text-primary' },
                { count: gaps.filter((g) => g.priority === 'Low' && !g.checked).length, label: 'Low', color: 'text-muted-foreground' },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 rounded-lg border border-border bg-background">
                  <div className={`font-[family-name:var(--font-d)] font-extrabold text-lg leading-none ${s.color}`}>{s.count}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background transition-all ${gap.checked ? 'opacity-50' : ''}`}
                >
                  <button
                    onClick={() => toggleGap(gap.id)}
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      gap.checked ? 'bg-emerald-500 text-white' : 'border-2 border-border'
                    }`}
                  >
                    {gap.checked && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-medium ${gap.checked ? 'line-through' : ''}`}>{gap.area}</div>
                    <div className="flex gap-1 flex-wrap mt-1">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        gap.priority === 'High' ? 'bg-destructive/10 text-destructive' :
                        gap.priority === 'Medium' ? 'bg-primary/10 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {gap.priority}
                      </span>
                      {gap.migration && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-500">
                          {gap.migration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Overview</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: agents.length, label: 'Agents', color: '' },
                  { val: activeAgents.length, label: 'Active', color: 'text-emerald-500' },
                  { val: referrals.length, label: 'Referrals', color: 'text-primary' },
                  { val: totalDeals, label: 'Deals/Yr', color: '' },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg border border-border bg-background">
                    <div className={`font-[family-name:var(--font-d)] font-extrabold text-xl leading-none ${s.color}`}>{s.val}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Coverage</div>
              {[
                { label: 'Midwest', pct: 85 },
                { label: 'Southeast', pct: 72 },
                { label: 'West', pct: 78 },
                { label: 'Northeast', pct: 60 },
                { label: 'South Central', pct: 45 },
              ].map((m) => (
                <div key={m.label} className="mb-2.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.label}</span>
                    <span className="text-muted-foreground">{m.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Specializations</div>
              <div className="space-y-1.5">
                {ALL_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: TAG_COLORS[tag] }} />
                    <span className="text-xs flex-1">{tag}</span>
                    <span className="font-[family-name:var(--font-d)] font-bold text-xs text-muted-foreground">{specCounts[tag] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">ROI Summary</div>
              {[
                { label: 'Total Fees (YTD)', value: `$${Math.round(totalFees).toLocaleString()}`, color: 'text-emerald-500' },
                { label: 'Conversion Rate', value: `${Math.round((closedReferrals.length / referrals.length) * 100)}%`, color: 'text-primary' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={`font-[family-name:var(--font-d)] font-bold text-sm ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
