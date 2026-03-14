'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS } from '@/lib/constants'
import { getInitials, formatCurrency } from '@/lib/utils'
import { MapPin, Check } from 'lucide-react'
import type { Candidate } from '@/types'

export default function RecruitingPage() {
  const { candidatesByZone, voidZones } = useAppData()
  const [selectedZone, setSelectedZone] = useState('')
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const candidates = selectedZone ? (candidatesByZone[selectedZone] || []) : []

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filters */}
      <div className="hidden md:flex flex-col w-[260px] min-w-[260px] overflow-y-auto p-5 border-r border-border bg-card">
        <div className="font-bold text-base mb-5">Find Agents</div>
        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Production</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Deals / Year (min)</label>
                <input type="number" defaultValue={15} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Deals / Year (max)</label>
                <input type="number" defaultValue={100} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Min Years Licensed</label>
                <input type="number" defaultValue={3} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Avg Sale Price</div>
            <div className="flex gap-2">
              <input defaultValue="$150k" className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-input bg-background text-sm" />
              <input defaultValue="$800k" className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-input bg-background text-sm" />
            </div>
          </div>
          <button className="w-full h-9 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">
            Apply Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card mb-5">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Coverage Gap:</label>
          <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm cursor-pointer">
            <option value="">— Select a void zone —</option>
            {voidZones.map((vz) => (<option key={vz.id} value={vz.id}>{vz.label}</option>))}
          </select>
        </div>

        {!selectedZone ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="font-bold text-base mb-1.5">Select a coverage gap</div>
            <div className="text-sm">Choose a void zone above to find agent candidates</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Matching Agents</h2>
              <span className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground">{candidates.length} found</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {candidates.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0" style={{ background: c.color }}>
                      {getInitials(c.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.brokerage}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[{ val: c.dealsPerYear, lbl: 'Deals/Yr' }, { val: `${c.yearsLicensed}yr`, lbl: 'Licensed' }, { val: formatCurrency(c.avgSalePrice), lbl: 'Avg Price' }].map((s) => (
                      <div key={s.lbl} className="text-center p-1.5 rounded-lg bg-secondary">
                        <div className="font-bold text-xs">{s.val}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{s.lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-2.5">{c.area}<br /><a className="text-primary">{c.email}</a></div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.tags.map((t) => (<span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white" style={{ background: TAG_COLORS[t] }}>{t}</span>))}
                  </div>
                  <button
                    onClick={() => setInvitedIds((p) => new Set(p).add(c.id))}
                    disabled={invitedIds.has(c.id)}
                    className={`w-full h-9 rounded-lg text-xs font-bold transition-all ${invitedIds.has(c.id) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                  >
                    {invitedIds.has(c.id) ? <><Check className="w-3 h-3 inline mr-1" />Invitation Sent</> : 'Invite to Network'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
