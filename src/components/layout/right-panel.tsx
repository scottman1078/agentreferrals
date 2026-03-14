'use client'

import { useState } from 'react'
import { coverageGaps } from '@/data/coverage-gaps'
import { agents } from '@/data/agents'
import { referrals } from '@/data/referrals'
import { TAG_COLORS, ALL_TAGS } from '@/lib/constants'

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

  // Specialization counts
  const specCounts: Record<string, number> = {}
  agents.forEach((a) => a.tags.forEach((t) => { specCounts[t] = (specCounts[t] || 0) + 1 }))

  return (
    <div
      className="w-[320px] min-w-[320px] hidden lg:flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['gaps', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-3.5 px-2 font-[family-name:var(--font-d)] text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-dim)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none',
            }}
          >
            {tab === 'gaps' ? 'Coverage Gaps' : 'Network Stats'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'gaps' ? (
          <div>
            {/* Mini stats */}
            <div className="flex gap-2 mb-3.5">
              <div className="flex-1 text-center p-1.5 rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                <div className="font-[family-name:var(--font-d)] font-extrabold text-lg leading-none" style={{ color: 'var(--red)' }}>
                  {gaps.filter((g) => g.priority === 'High' && !g.checked).length}
                </div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>High</div>
              </div>
              <div className="flex-1 text-center p-1.5 rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                <div className="font-[family-name:var(--font-d)] font-extrabold text-lg leading-none" style={{ color: 'var(--accent)' }}>
                  {gaps.filter((g) => g.priority === 'Medium' && !g.checked).length}
                </div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>Med</div>
              </div>
              <div className="flex-1 text-center p-1.5 rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                <div className="font-[family-name:var(--font-d)] font-extrabold text-lg leading-none" style={{ color: 'var(--indigo)' }}>
                  {gaps.filter((g) => g.priority === 'Low' && !g.checked).length}
                </div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>Low</div>
              </div>
            </div>

            {/* Gap items */}
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg mb-2 transition-all"
                style={{
                  background: 'var(--surf2)',
                  border: '1px solid var(--border)',
                  opacity: gap.checked ? 0.5 : 1,
                }}
              >
                <button
                  onClick={() => toggleGap(gap.id)}
                  className="w-[18px] h-[18px] rounded flex items-center justify-center text-[11px] shrink-0 mt-0.5 transition-all"
                  style={{
                    border: gap.checked ? 'none' : '2px solid var(--border2)',
                    background: gap.checked ? 'var(--green)' : 'transparent',
                    color: gap.checked ? 'white' : 'transparent',
                  }}
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-medium mb-1 ${gap.checked ? 'line-through' : ''}`}>{gap.area}</div>
                  <div className="flex gap-1 flex-wrap">
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                      style={{
                        background: gap.priority === 'High' ? 'rgba(239,68,68,0.15)' : gap.priority === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                        color: gap.priority === 'High' ? '#f87171' : gap.priority === 'Medium' ? '#fbbf24' : '#818cf8',
                      }}
                    >
                      {gap.priority}
                    </span>
                    {gap.migration && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
                        {gap.migration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* Network stats */}
            <div className="mb-5">
              <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Network Overview
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                  <div className="font-[family-name:var(--font-d)] font-extrabold text-[22px] leading-none mb-0.5">{agents.length}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Total Agents</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                  <div className="font-[family-name:var(--font-d)] font-extrabold text-[22px] leading-none mb-0.5" style={{ color: 'var(--green)' }}>{activeAgents.length}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Active</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                  <div className="font-[family-name:var(--font-d)] font-extrabold text-[22px] leading-none mb-0.5" style={{ color: 'var(--accent)' }}>{referrals.length}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Referrals</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
                  <div className="font-[family-name:var(--font-d)] font-extrabold text-[22px] leading-none mb-0.5">{totalDeals}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Combined Deals/Yr</div>
                </div>
              </div>
            </div>

            {/* Coverage */}
            <div className="mb-5">
              <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Market Coverage
              </div>
              {[
                { label: 'Midwest', pct: 85 },
                { label: 'Southeast', pct: 72 },
                { label: 'Northeast', pct: 60 },
                { label: 'West', pct: 78 },
                { label: 'South Central', pct: 45 },
              ].map((m) => (
                <div key={m.label} className="mb-2.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.label}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{m.pct}%</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--surf3)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${m.pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Specializations */}
            <div className="mb-5">
              <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Specializations
              </div>
              <div className="flex flex-col gap-1.5">
                {ALL_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: TAG_COLORS[tag] }} />
                    <span className="text-xs flex-1">{tag}</span>
                    <span className="font-[family-name:var(--font-d)] font-bold text-xs" style={{ color: 'var(--text-dim)' }}>
                      {specCounts[tag] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROI Summary */}
            <div>
              <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                ROI Summary
              </div>
              {[
                { label: 'Total Referral Fees (YTD)', value: `$${Math.round(totalFees).toLocaleString()}`, color: 'var(--green)' },
                { label: 'Avg Fee per Referral', value: `$${closedReferrals.length ? Math.round(totalFees / closedReferrals.length).toLocaleString() : '0'}`, color: 'var(--text)' },
                { label: 'Conversion Rate', value: `${Math.round((closedReferrals.length / referrals.length) * 100)}%`, color: 'var(--accent)' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                  <span className="font-[family-name:var(--font-d)] font-bold text-[13px]" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
