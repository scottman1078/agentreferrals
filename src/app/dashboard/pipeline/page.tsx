'use client'

import { useState } from 'react'
import { referrals as initialReferrals } from '@/data/referrals'
import { PIPELINE_STAGES, STAGE_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import type { PipelineStage } from '@/types'

export default function PipelinePage() {
  const [referralList, setReferralList] = useState(initialReferrals)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const stageReferrals = (stage: PipelineStage) => referralList.filter((r) => r.stage === stage)
  const totalValue = referralList.reduce((s, r) => s + r.estimatedPrice, 0)
  const totalFees = referralList.reduce((s, r) => s + r.estimatedPrice * (r.feePercent / 100), 0)

  function handleDrop(stage: PipelineStage) {
    if (!draggedId) return
    setReferralList((prev) => prev.map((r) => (r.id === draggedId ? { ...r, stage } : r)))
    setDraggedId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-5 px-6 pt-5 pb-4 shrink-0 border-b border-border">
        <h1 className="font-bold text-xl">Referral Pipeline</h1>
        <div className="flex gap-5 ml-auto">
          <div className="text-right">
            <div className="font-bold text-lg">{referralList.length}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{formatCurrency(totalValue)}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Volume</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-emerald-500">{formatCurrency(totalFees)}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Est. Fees</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto overflow-y-hidden px-5 py-4 flex-1 items-start">
        {PIPELINE_STAGES.map((stage) => {
          const stageColor = STAGE_COLORS[stage]
          const cards = stageReferrals(stage)
          return (
            <div key={stage} className="min-w-[220px] max-w-[220px] flex flex-col gap-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-1" style={{ background: `${stageColor}12` }}>
                <div className="font-bold text-[11px] font-bold uppercase tracking-wider" style={{ color: stageColor }}>{stage}</div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-secondary text-secondary-foreground">{cards.length}</div>
              </div>
              <div
                className="min-h-[100px] rounded-lg p-0.5 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5', 'outline', 'outline-1', 'outline-dashed', 'outline-primary/30') }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-primary/5', 'outline', 'outline-1', 'outline-dashed', 'outline-primary/30') }}
                onDrop={(e) => { e.currentTarget.classList.remove('bg-primary/5', 'outline', 'outline-1', 'outline-dashed', 'outline-primary/30'); handleDrop(stage) }}
              >
                {cards.map((ref) => (
                  <div
                    key={ref.id}
                    draggable
                    onDragStart={() => setDraggedId(ref.id)}
                    className="p-3 rounded-lg mb-2 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 border border-border bg-card hover:shadow-md"
                    style={{ borderLeftWidth: '3px', borderLeftColor: stageColor, opacity: draggedId === ref.id ? 0.25 : 1 }}
                  >
                    <div className="font-semibold text-[13px] mb-1.5">{ref.clientName}</div>
                    <div className="text-xs text-muted-foreground mb-1.5">{ref.market}</div>
                    <div className="text-[11px] text-muted-foreground">{ref.fromAgent} → {ref.toAgent}</div>
                    <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
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
