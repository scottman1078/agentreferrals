'use client'

import { useState } from 'react'
import { referrals as initialReferrals } from '@/data/referrals'
import { PIPELINE_STAGES, STAGE_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import type { Referral, PipelineStage } from '@/types'

export default function PipelinePage() {
  const [referralList, setReferralList] = useState(initialReferrals)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const stageReferrals = (stage: PipelineStage) => referralList.filter((r) => r.stage === stage)

  const totalValue = referralList.reduce((s, r) => s + r.estimatedPrice, 0)
  const totalFees = referralList.reduce((s, r) => s + r.estimatedPrice * (r.feePercent / 100), 0)

  function handleDragStart(id: string) {
    setDraggedId(id)
  }

  function handleDrop(stage: PipelineStage) {
    if (!draggedId) return
    setReferralList((prev) =>
      prev.map((r) => (r.id === draggedId ? { ...r, stage } : r))
    )
    setDraggedId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-5 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="font-[family-name:var(--font-d)] font-bold text-xl">Referral Pipeline</div>
        <div className="flex gap-5 ml-auto">
          <div className="text-right">
            <div className="font-[family-name:var(--font-d)] font-bold text-lg">{referralList.length}</div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Active</div>
          </div>
          <div className="text-right">
            <div className="font-[family-name:var(--font-d)] font-bold text-lg">{formatCurrency(totalValue)}</div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Volume</div>
          </div>
          <div className="text-right">
            <div className="font-[family-name:var(--font-d)] font-bold text-lg" style={{ color: 'var(--green)' }}>{formatCurrency(totalFees)}</div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Est. Fees</div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto overflow-y-hidden px-5 py-4 flex-1 items-start">
        {PIPELINE_STAGES.map((stage) => {
          const stageColor = STAGE_COLORS[stage]
          const cards = stageReferrals(stage)
          return (
            <div key={stage} className="min-w-[220px] max-w-[220px] flex flex-col gap-2">
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-md mb-1"
                style={{ background: `${stageColor}15` }}
              >
                <div className="font-[family-name:var(--font-d)] text-xs font-bold uppercase tracking-wider" style={{ color: stageColor }}>
                  {stage}
                </div>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-[family-name:var(--font-d)]"
                  style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text)' }}
                >
                  {cards.length}
                </div>
              </div>

              {/* Drop zone */}
              <div
                className="min-h-[100px] rounded-lg p-0.5 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(240,165,0,0.06)'; e.currentTarget.style.outline = '1.5px dashed rgba(240,165,0,0.45)' }}
                onDragLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.outline = '' }}
                onDrop={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.outline = ''; handleDrop(stage) }}
              >
                {cards.map((ref) => (
                  <div
                    key={ref.id}
                    draggable
                    onDragStart={() => handleDragStart(ref.id)}
                    className="p-3 rounded-lg mb-2 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                    style={{
                      background: 'var(--surf2)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${stageColor}`,
                      opacity: draggedId === ref.id ? 0.25 : 1,
                    }}
                  >
                    <div className="font-semibold text-[13px] mb-1.5">{ref.clientName}</div>
                    <div className="text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>{ref.market}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {ref.fromAgent} → {ref.toAgent}
                    </div>
                    <div
                      className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: 'var(--accent-bg)', border: '1px solid rgba(240,165,0,0.2)', color: 'var(--accent)' }}
                    >
                      {ref.feePercent}% · {formatCurrency(ref.estimatedPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
