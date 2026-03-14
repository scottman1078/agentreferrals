'use client'

import { useState } from 'react'
import { candidatesByZone } from '@/data/candidates'
import { voidZones } from '@/data/coverage-gaps'
import { TAG_COLORS } from '@/lib/constants'
import { getInitials, formatCurrency } from '@/lib/utils'
import type { Candidate } from '@/types'

export default function RecruitingPage() {
  const [selectedZone, setSelectedZone] = useState('')
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  const candidates = selectedZone ? (candidatesByZone[selectedZone] || []) : []

  function inviteCandidate(id: string) {
    setInvitedIds((prev) => new Set(prev).add(id))
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filters sidebar */}
      <div
        className="hidden md:block w-[280px] min-w-[280px] overflow-y-auto p-5"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="font-[family-name:var(--font-d)] font-bold text-base mb-5">Find Agents</div>

        <div className="mb-6">
          <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Production</div>
          <div className="mb-3">
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>Deals / Year (min)</label>
            <input type="number" defaultValue={15} className="w-full px-3 py-2 text-[13px] rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="mb-3">
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>Deals / Year (max)</label>
            <input type="number" defaultValue={100} className="w-full px-3 py-2 text-[13px] rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="mb-3">
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>Min Years Licensed</label>
            <input type="number" defaultValue={3} className="w-full px-3 py-2 text-[13px] rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        <div className="mb-6">
          <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Avg Sale Price</div>
          <div className="flex gap-2">
            <input defaultValue="$150k" className="flex-1 min-w-0 px-3 py-2 text-[13px] rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <input defaultValue="$800k" className="flex-1 min-w-0 px-3 py-2 text-[13px] rounded-md" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        <div className="mb-6">
          <div className="font-[family-name:var(--font-d)] text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Agent Type</div>
          <select className="w-full px-3 py-2 text-[13px] rounded-md cursor-pointer" style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <option>Any</option>
            <option>Solo Agent</option>
            <option>Team Member</option>
          </select>
        </div>

        <button
          className="w-full py-2.5 rounded-md font-[family-name:var(--font-d)] font-bold text-[13px] transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#0f1117' }}
        >
          Apply Filters
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Zone selector */}
        <div className="flex items-center gap-3 p-3.5 rounded-lg mb-5" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
          <label className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>Coverage Gap:</label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer"
            style={{ background: 'var(--surf3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
          >
            <option value="">— Select a void zone —</option>
            {voidZones.map((vz) => (
              <option key={vz.id} value={vz.id}>{vz.label}</option>
            ))}
          </select>
        </div>

        {!selectedZone ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <div className="text-3xl mb-3">🗺</div>
            <div className="font-[family-name:var(--font-d)] font-bold text-base mb-1.5">Select a coverage gap to find agents</div>
            <div className="text-[13px]">Choose a void zone above to see matching agent candidates in that area</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="font-[family-name:var(--font-d)] font-bold text-lg">Matching Agents</div>
              <span className="px-2.5 py-0.5 rounded-full text-xs" style={{ background: 'var(--surf3)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                {candidates.length} found
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {candidates.map((c) => (
                <CandidateCard key={c.id} candidate={c} invited={invitedIds.has(c.id)} onInvite={() => inviteCandidate(c.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CandidateCard({ candidate: c, invited, onInvite }: { candidate: Candidate; invited: boolean; onInvite: () => void }) {
  return (
    <div className="p-4 rounded-lg transition-all hover:shadow-lg" style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-[family-name:var(--font-d)] font-bold text-[13px]"
            style={{ background: c.color, color: '#0f1117' }}
          >
            {getInitials(c.name)}
          </div>
          <div>
            <div className="font-semibold text-sm">{c.name}</div>
            <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{c.brokerage}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 my-2.5">
        {[
          { val: c.dealsPerYear, label: 'Deals/Yr' },
          { val: `${c.yearsLicensed}yr`, label: 'Licensed' },
          { val: formatCurrency(c.avgSalePrice), label: 'Avg Price' },
        ].map((s) => (
          <div key={s.label} className="text-center p-1.5 rounded-md" style={{ background: 'var(--surf3)' }}>
            <div className="font-[family-name:var(--font-d)] font-bold text-[13px]">{s.val}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-[11px] mb-2.5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        {c.area}<br />
        <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)' }}>{c.email}</a>
      </div>

      <div className="flex flex-wrap gap-1 mb-2.5">
        {c.tags.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: TAG_COLORS[t], color: '#0f1117', opacity: 0.9 }}>
            {t}
          </span>
        ))}
      </div>

      <button
        onClick={onInvite}
        disabled={invited}
        className="w-full py-2 rounded-md font-[family-name:var(--font-d)] font-bold text-xs transition-all"
        style={invited
          ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--green)' }
          : { background: 'var(--accent-bg)', border: '1px solid rgba(240,165,0,0.35)', color: 'var(--accent)' }
        }
      >
        {invited ? '✓ Invitation Sent' : 'Invite to Network'}
      </button>
    </div>
  )
}
